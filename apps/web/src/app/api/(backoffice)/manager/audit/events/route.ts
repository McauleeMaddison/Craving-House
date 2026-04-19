import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/access";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = new Set(["audit", "api_error", "uptime"]);
const ALLOWED_SEVERITIES = new Set(["info", "warning", "critical"]);

export async function GET(request: Request) {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") ?? 120);
  const limit = Number.isFinite(limitRaw) ? Math.min(300, Math.max(1, Math.round(limitRaw))) : 120;
  const category = (searchParams.get("category") ?? "").trim();
  const severity = (searchParams.get("severity") ?? "").trim();

  const where: Record<string, unknown> = {};
  if (ALLOWED_CATEGORIES.has(category)) where.category = category;
  if (ALLOWED_SEVERITIES.has(severity)) where.severity = severity;

  const [events, summary] = await Promise.all([
    prisma.opsEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit
    }),
    prisma.$transaction([
      prisma.opsEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, category: "api_error" } }),
      prisma.opsEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, severity: "critical" } }),
      prisma.opsEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, category: "audit" } })
    ])
  ]);

  return NextResponse.json({
    summary24h: {
      apiErrors: summary[0],
      criticalEvents: summary[1],
      auditEvents: summary[2]
    },
    events: events.map((event) => ({
      id: event.id,
      category: event.category,
      severity: event.severity,
      area: event.area,
      action: event.action ?? null,
      message: event.message,
      details: event.details ?? null,
      requestId: event.requestId ?? null,
      userId: event.userId ?? null,
      createdAtIso: event.createdAt.toISOString()
    }))
  });
}
