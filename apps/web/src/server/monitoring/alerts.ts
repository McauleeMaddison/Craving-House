import { isEmailConfigured, sendOperationsAlertEmail } from "../notifications/email.ts";
import { rateLimit } from "../security/rate-limit.ts";

const DEFAULT_ALERT_COOLDOWN_SECONDS = 300;

type OperationsAlertParams = {
  area: string;
  dedupeKey?: string;
  severity?: "info" | "warning" | "critical";
  subject: string;
  message: string;
  details?: Record<string, unknown>;
  error?: unknown;
};

type OperationsAlertEnv = Partial<
  Pick<NodeJS.ProcessEnv, "OPERATIONS_ALERT_EMAIL" | "OPERATIONS_ALERT_WEBHOOK_URL" | "OPERATIONS_ALERT_COOLDOWN_SECONDS">
>;

function normalizeEmail(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUrl(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

export function getOperationsAlertCooldownSeconds(env?: OperationsAlertEnv) {
  const raw = (env ?? process.env).OPERATIONS_ALERT_COOLDOWN_SECONDS?.trim() ?? "";
  if (!raw) return DEFAULT_ALERT_COOLDOWN_SECONDS;

  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_ALERT_COOLDOWN_SECONDS;
  return Math.min(3600, Math.max(60, Math.round(value)));
}

export function getOperationsAlertConfig(env?: OperationsAlertEnv) {
  const runtimeEnv =
    env ??
    ({
      OPERATIONS_ALERT_EMAIL: process.env.OPERATIONS_ALERT_EMAIL,
      OPERATIONS_ALERT_WEBHOOK_URL: process.env.OPERATIONS_ALERT_WEBHOOK_URL,
      OPERATIONS_ALERT_COOLDOWN_SECONDS: process.env.OPERATIONS_ALERT_COOLDOWN_SECONDS
    } satisfies OperationsAlertEnv);
  const emailTo = normalizeEmail(runtimeEnv.OPERATIONS_ALERT_EMAIL);
  const webhookUrl = normalizeUrl(runtimeEnv.OPERATIONS_ALERT_WEBHOOK_URL);
  const cooldownSeconds = getOperationsAlertCooldownSeconds(runtimeEnv);
  const emailEnabled = Boolean(emailTo && isEmailConfigured());
  return {
    cooldownSeconds,
    emailTo,
    emailEnabled,
    enabled: Boolean(emailEnabled || webhookUrl),
    webhookUrl
  } as const;
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null
    };
  }
  return { value: String(error) };
}

function formatDetails(details: Record<string, unknown> | undefined) {
  if (!details || Object.keys(details).length === 0) return "None";
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n");
}

export async function sendOperationsAlert(params: OperationsAlertParams) {
  const cfg = getOperationsAlertConfig();
  if (!cfg.enabled) return { sent: false as const, reason: "not_configured" as const };

  const severity = params.severity ?? "warning";
  const dedupeKey = params.dedupeKey?.trim() || `${params.area}:${params.subject}`;
  try {
    const throttle = await rateLimit({
      key: `ops-alert:${dedupeKey}`,
      limit: 1,
      windowMs: cfg.cooldownSeconds * 1000
    });
    if (!throttle.ok) {
      return { sent: false as const, reason: "throttled" as const };
    }
  } catch (error) {
    console.error("Failed to apply operations alert throttle", error);
  }

  const payload = {
    area: params.area,
    subject: params.subject,
    message: params.message,
    severity,
    details: params.details ?? {},
    error: formatError(params.error),
    sentAtIso: new Date().toISOString()
  };
  const sentChannels: Array<"email" | "webhook"> = [];
  if (cfg.emailTo && cfg.emailEnabled) {
    try {
      await sendOperationsAlertEmail({
        to: cfg.emailTo,
        subject: `[Craving House][${severity.toUpperCase()}] ${params.subject}`,
        text: [
          `Severity: ${severity}`,
          `Area: ${params.area}`,
          "",
          params.message,
          "",
          "Details:",
          formatDetails(params.details),
          "",
          "Error:",
          JSON.stringify(payload.error, null, 2)
        ].join("\n")
      });
      sentChannels.push("email");
    } catch (error) {
      console.error("Failed to send operations alert email", error);
    }
  }

  if (cfg.webhookUrl) {
    try {
      const response = await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Alert webhook returned ${response.status}`);
      }
      sentChannels.push("webhook");
    } catch (error) {
      console.error("Failed to send operations alert webhook", error);
    }
  }

  if (sentChannels.length === 0) {
    return { sent: false as const, reason: "send_failed" as const };
  }

  return { sent: true as const, channels: sentChannels };
}
