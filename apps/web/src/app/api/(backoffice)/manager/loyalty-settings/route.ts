import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/access";
import { isSameOrigin } from "@/server/security/request-security";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";

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

  const existing = await prisma.loyaltyProgramSettings.findFirst({ select: { id: true } });
  if (existing) {
    await prisma.loyaltyProgramSettings.update({
      where: { id: existing.id },
      data: { rewardStamps: Math.round(rewardStamps) }
    });
  } else {
    await prisma.loyaltyProgramSettings.create({
      data: { rewardStamps: Math.round(rewardStamps) }
    });
  }

  return NextResponse.json({ ok: true });
}
