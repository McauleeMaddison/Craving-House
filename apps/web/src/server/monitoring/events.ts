import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { sendOperationsAlert } from "@/server/monitoring/alerts";
import { sendSentryEvent } from "@/server/monitoring/sentry";

export type OpsEventSeverity = "info" | "warning" | "critical";
export type OpsEventCategory = "audit" | "api_error" | "uptime";

type BaseOpsEventParams = {
  category: OpsEventCategory;
  severity?: OpsEventSeverity;
  area: string;
  action?: string;
  message: string;
  details?: Record<string, unknown> | null;
  requestId?: string | null;
  userId?: string | null;
};

type AuditEventParams = Omit<BaseOpsEventParams, "category" | "severity">;

type ApiErrorEventParams = {
  area: string;
  action?: string;
  message: string;
  details?: Record<string, unknown> | null;
  requestId?: string | null;
  userId?: string | null;
  severity?: "warning" | "critical";
  error?: unknown;
};

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDetails(details: Record<string, unknown> | null | undefined) {
  if (!details) return undefined;
  if (Object.keys(details).length === 0) return undefined;
  try {
    return JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue;
  } catch {
    return { serializationError: "Could not serialize details payload." } as Prisma.InputJsonValue;
  }
}

export async function recordOpsEvent(params: BaseOpsEventParams) {
  const normalizedDetails = normalizeDetails(params.details);
  try {
    await prisma.opsEvent.create({
      data: {
        category: params.category,
        severity: params.severity ?? "info",
        area: params.area,
        action: normalizeText(params.action),
        message: params.message,
        details: normalizedDetails,
        requestId: normalizeText(params.requestId),
        userId: normalizeText(params.userId)
      }
    });
  } catch (error) {
    console.error("Failed to persist ops event", error);
  }
}

export async function recordAuditEvent(params: AuditEventParams) {
  await recordOpsEvent({
    category: "audit",
    severity: "info",
    ...params
  });
}

export async function recordApiErrorEvent(params: ApiErrorEventParams) {
  const severity = params.severity ?? "warning";
  const details = {
    ...(params.details ?? {}),
    error:
      params.error instanceof Error
        ? { name: params.error.name, message: params.error.message, stack: params.error.stack ?? null }
        : params.error
          ? { value: String(params.error) }
          : null
  };

  await recordOpsEvent({
    category: "api_error",
    severity,
    area: params.area,
    action: params.action,
    message: params.message,
    details,
    requestId: params.requestId ?? null,
    userId: params.userId ?? null
  });

  await Promise.allSettled([
    sendOperationsAlert({
      area: params.area,
      severity: severity === "critical" ? "critical" : "warning",
      subject: params.message,
      message: params.message,
      details,
      error: params.error,
      dedupeKey: `${params.area}:${params.action ?? "unknown"}:${params.message}`
    }),
    sendSentryEvent({
      level: severity === "critical" ? "fatal" : "error",
      area: params.area,
      action: params.action,
      message: params.message,
      details,
      requestId: params.requestId ?? undefined,
      userId: params.userId ?? undefined
    })
  ]);
}
