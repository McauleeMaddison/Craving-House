import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/access";
import { isSameOrigin } from "@/server/security/request-security";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";
import { recordAuditEvent } from "@/server/monitoring/events";

export const dynamic = "force-dynamic";

type PatchBody = Partial<{
  rewardStamps: number;
}>;

export async function GET() {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
    );
  }

  const settings = await prisma.loyaltyProgramSettings.findFirst();
  return NextResponse.json({
    rewardStamps: settings?.rewardStamps ?? 5
  });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
    );
  }

  const ip = getClientIp(request);
  const limited = await rateLimit({
    key: `manager:loyalty-settings:update:${access.userId}:${ip}`,
    limit: 20,
    windowMs: 60_000
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many settings changes. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const body = (await request.json()) as PatchBody;
  const rewardStamps = Number(body.rewardStamps);
  if (!Number.isFinite(rewardStamps) || rewardStamps < 1 || rewardStamps > 20) {
    return NextResponse.json({ error: "rewardStamps must be between 1 and 20" }, { status: 400 });
  }

  const existing = await prisma.loyaltyProgramSettings.findFirst({ select: { id: true, rewardStamps: true } });
  const nextRewardStamps = Math.round(rewardStamps);
  if (existing) {
    await prisma.loyaltyProgramSettings.update({
      where: { id: existing.id },
      data: { rewardStamps: nextRewardStamps }
    });
  } else {
    await prisma.loyaltyProgramSettings.create({
      data: { rewardStamps: nextRewardStamps }
    });
  }

  void recordAuditEvent({
    area: "manager.loyalty",
    action: "update_settings",
    userId: access.userId,
    message: "Manager updated loyalty settings",
    details: {
      fromRewardStamps: existing?.rewardStamps ?? 5,
      toRewardStamps: nextRewardStamps
    }
  });

  return NextResponse.json({ ok: true });
}
