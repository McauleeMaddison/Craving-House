import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [settings, account] = await Promise.all([
    prisma.loyaltyProgramSettings.findFirst(),
    prisma.loyaltyAccount.findUnique({
      where: { userId: access.userId }
    })
  ]);

  const rewardStamps = settings?.rewardStamps ?? 5;
  const stamps = account?.stamps ?? 0;
  const rewardsRedeemed = account?.rewardsRedeemed ?? 0;

  return NextResponse.json({ stamps, rewardsRedeemed, rewardStamps });
}

