import { isEmailConfigured, sendOperationsAlertEmail } from "../notifications/email.ts";

type OperationsAlertEnv = Partial<Pick<NodeJS.ProcessEnv, "OPERATIONS_ALERT_EMAIL">>;

type OperationsAlertParams = {
  area: string;
  subject: string;
  message: string;
  details?: Record<string, unknown>;
  error?: unknown;
};

function normalizeEmail(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function getOperationsAlertConfig(env?: OperationsAlertEnv) {
  const emailTo = normalizeEmail((env ?? process.env).OPERATIONS_ALERT_EMAIL);
  return {
    emailTo,
    enabled: Boolean(emailTo && isEmailConfigured())
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
  if (!cfg.enabled || !cfg.emailTo) return { sent: false as const, reason: "not_configured" as const };

  try {
    await sendOperationsAlertEmail({
      to: cfg.emailTo,
      subject: `[Craving House] ${params.subject}`,
      text: [
        `Area: ${params.area}`,
        "",
        params.message,
        "",
        "Details:",
        formatDetails(params.details),
        "",
        "Error:",
        JSON.stringify(formatError(params.error), null, 2)
      ].join("\n")
    });
    return { sent: true as const };
  } catch (error) {
    console.error("Failed to send operations alert", error);
    return { sent: false as const, reason: "send_failed" as const };
  }
}
