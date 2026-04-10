import { NextResponse } from "next/server";

import { calculateEarnedStampsFromEligibleItems } from "@/lib/loyalty";
import { prisma } from "@/server/db";
import { verifyCustomerQrToken } from "@/server/loyalty/qr";
import { requireRole } from "@/server/auth/access";
import { isSameOrigin } from "@/server/security/request-security";

type StampRequest = {
  qrToken: string;
  cardToken?: string;
  eligibleItemCount: number;
  orderId?: string;
  idempotencyKey?: string;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const access = await requireRole(["staff"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
    );
  }
  const staffUserId = access.userId;

  const body = (await request.json()) as Partial<StampRequest>;
  const qrToken = typeof body.qrToken === "string" ? body.qrToken.trim() : "";
  const cardToken = typeof body.cardToken === "string" ? body.cardToken.trim() : "";
  if (!qrToken && !cardToken) {
    return NextResponse.json({ error: "Missing qrToken/cardToken" }, { status: 400 });
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

  let customerUserId = "";
  if (cardToken) {
    const account = await prisma.loyaltyAccount.findFirst({ where: { cardToken }, select: { userId: true } });
    customerUserId = account?.userId ?? "";
  } else {
    const secret = process.env.QR_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Missing QR_SECRET" }, { status: 500 });
    }
    try {
      const verified = verifyCustomerQrToken({ token: qrToken, secret });
      customerUserId = verified.userId;
    } catch {
      return NextResponse.json({ error: "Invalid or expired qrToken" }, { status: 400 });
    }
  }
  if (!customerUserId) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    const idempotencyKey = body.idempotencyKey?.trim() || "";
    if (idempotencyKey) {
      const existing = await tx.loyaltyStamp.findUnique({ where: { idempotencyKey } });
      if (existing) {
        const account = await tx.loyaltyAccount.findUnique({ where: { id: existing.loyaltyAccountId } });
        return {
          earned: calculateEarnedStampsFromEligibleItems({ eligibleItemCount: existing.eligibleItemCount }),
          totalStamps: account?.stamps ?? 0
        };
      }
    }

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
        idempotencyKey: idempotencyKey || null,
        source: "scan"
      }
    });

    return { earned, totalStamps: updatedAccount.stamps };
  });

  return NextResponse.json(result);
}
