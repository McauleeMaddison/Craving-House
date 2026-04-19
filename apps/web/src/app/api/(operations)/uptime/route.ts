import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { getStripeRuntimeConfig } from "@/server/payments/stripe";
import { recordApiErrorEvent, recordOpsEvent } from "@/server/monitoring/events";

export const dynamic = "force-dynamic";

function timingSafeEquals(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function readUptimeToken(request: Request) {
  const explicit = request.headers.get("x-uptime-token")?.trim();
  if (explicit) return explicit;

  const auth = request.headers.get("authorization")?.trim();
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice("bearer ".length).trim() || null;
}

function isAuthorized(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  const configured = process.env.UPTIME_CHECK_TOKEN?.trim();
  if (!configured) return false;
  const supplied = readUptimeToken(request);
  if (!supplied) return false;
  return timingSafeEquals(configured, supplied);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const startedAt = Date.now();
  const checks: Record<string, { ok: boolean; detail?: string }> = {
    database: { ok: true },
    stripeConfig: { ok: true }
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    checks.database = {
      ok: false,
      detail: error instanceof Error ? error.message : "Database check failed"
    };
  }

  const stripe = getStripeRuntimeConfig();
  checks.stripeConfig = {
    ok: stripe.enabled,
    detail: stripe.enabled
      ? `mode=${stripe.mode}`
      : "Stripe not fully configured (set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET)"
  };

  const failingChecks = Object.entries(checks)
    .filter(([, value]) => !value.ok)
    .map(([key, value]) => ({ key, detail: value.detail ?? "failed" }));
  const ok = failingChecks.length === 0;

  if (!ok) {
    const message = `Uptime check failed (${failingChecks.length} checks)`;
    await recordApiErrorEvent({
      area: "operations.uptime",
      action: "check",
      severity: "critical",
      message,
      details: {
        failingChecks,
        checks,
        url: request.url
      }
    });
  } else {
    await recordOpsEvent({
      category: "uptime",
      severity: "info",
      area: "operations.uptime",
      action: "check",
      message: "Uptime check passed",
      details: {
        latencyMs: Date.now() - startedAt,
        checks
      }
    });
  }

  return NextResponse.json(
    {
      ok,
      checkedAtIso: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      checks
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" }
    }
  );
}
