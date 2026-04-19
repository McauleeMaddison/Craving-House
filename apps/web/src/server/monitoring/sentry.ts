import crypto from "node:crypto";

type SentryEventLevel = "info" | "warning" | "error" | "fatal";

type SendSentryEventParams = {
  level: SentryEventLevel;
  message: string;
  area: string;
  action?: string;
  details?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
};

type ParsedSentryDsn = {
  protocol: string;
  publicKey: string;
  host: string;
  pathPrefix: string;
  projectId: string;
};

function parseSentryDsn(raw: string | undefined): ParsedSentryDsn | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  try {
    const url = new URL(value);
    const projectId = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    if (!url.protocol || !url.host || !url.username || !projectId) return null;

    const basePath = url.pathname.replace(/\/+$/, "");
    const suffix = `/${projectId}`;
    const pathPrefix = basePath.endsWith(suffix)
      ? basePath.slice(0, Math.max(0, basePath.length - suffix.length))
      : "";

    return {
      protocol: url.protocol,
      publicKey: url.username,
      host: url.host,
      pathPrefix,
      projectId
    };
  } catch {
    return null;
  }
}

function toSentryLevel(level: SentryEventLevel) {
  if (level === "warning") return "warning";
  if (level === "fatal") return "fatal";
  if (level === "error") return "error";
  return "info";
}

export function isSentryConfigured() {
  return Boolean(parseSentryDsn(process.env.SENTRY_DSN));
}

export async function sendSentryEvent(params: SendSentryEventParams) {
  const dsn = parseSentryDsn(process.env.SENTRY_DSN);
  if (!dsn) return { sent: false as const, reason: "not_configured" as const };

  const query = new URLSearchParams({
    sentry_key: dsn.publicKey,
    sentry_version: "7",
    sentry_client: "craving-house-observability/1.0"
  });
  const endpoint = `${dsn.protocol}//${dsn.host}${dsn.pathPrefix}/api/${dsn.projectId}/store/?${query.toString()}`;
  const eventId = crypto.randomUUID().replace(/-/g, "");

  const payload = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: "node",
    level: toSentryLevel(params.level),
    logger: "craving-house.api",
    message: params.message,
    tags: {
      area: params.area,
      action: params.action ?? "none"
    },
    extra: {
      ...params.details,
      requestId: params.requestId ?? null,
      userId: params.userId ?? null
    },
    release: process.env.SENTRY_RELEASE?.trim() || undefined,
    environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || "development"
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      return { sent: false as const, reason: "http_error" as const, status: response.status };
    }
    return { sent: true as const, eventId };
  } catch (error) {
    console.error("Failed to send Sentry event", error);
    return { sent: false as const, reason: "network_error" as const };
  }
}
