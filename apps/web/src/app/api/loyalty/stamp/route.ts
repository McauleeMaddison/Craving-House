import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { calculateEarnedStampsFromEligibleItems } from "@/lib/loyalty";
import { prisma } from "@/server/db";
import { verifyCustomerQrToken } from "@/server/qr";
import { authOptions } from "@/server/auth";
import { isSameOrigin } from "@/server/request-security";

type StampRequest = {
  qrToken: string;
  eligibleItemCount: number;
  orderId?: string;
  idempotencyKey?: string;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "staff" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const staffUserId = session.user.id;

  const body = (await request.json()) as Partial<StampRequest>;
  if (!body.qrToken || typeof body.qrToken !== "string") {
    return NextResponse.json({ error: "Missing qrToken" }, { status: 400 });
  }
  if (
    !Number.isFinite(body.eligibleItemCount) ||
    (body.eligibleItemCount ?? 0) <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid eligibleItemCount" },
      { status: 400 }
    );
  }

  const secret = process.env.QR_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing QR_SECRET" }, { status: 500 });
  }

  const { userId: customerUserId } = verifyCustomerQrToken({
    token: body.qrToken,
    secret
  });

  const result = await prisma.$transaction(async (tx) => {
    const settings =
      (await tx.loyaltyProgramSettings.findFirst()) ??
      (await tx.loyaltyProgramSettings.create({ data: {} }));

    const earned = calculateEarnedStampsFromEligibleItems({
      eligibleItemCount: body.eligibleItemCount!
    });
    if (earned <= 0) return { earned: 0, totalStamps: 0 };

    const account = await tx.loyaltyAccount.upsert({
      where: { userId: customerUserId },
      create: { userId: customerUserId, stamps: 0, rewardsRedeemed: 0 },
      update: {}
    });

    const updatedAccount = await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: { stamps: { increment: earned } }
    });

    await tx.loyaltyStamp.create({
      data: {
        loyaltyAccountId: account.id,
        orderId: body.orderId ?? null,
        eligibleItemCount: body.eligibleItemCount!,
        createdByStaffId: staffUserId,
        idempotencyKey: body.idempotencyKey ?? null,
        source: "scan"
      }
    });

    return { earned, totalStamps: updatedAccount.stamps };
  });

  return NextResponse.json(result);
}
