import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";

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
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
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

