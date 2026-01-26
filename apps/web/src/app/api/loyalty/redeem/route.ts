import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";
import { isSameOrigin } from "@/server/request-security";

type Body = {
  cardToken: string;
  orderId?: string;
  idempotencyKey?: string;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const access = await requireRole(["staff", "manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const body = (await request.json().catch(() => null)) as Partial<Body> | null;
  const cardToken = String(body?.cardToken ?? "").trim();
  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  if (!cardToken) return NextResponse.json({ error: "Missing cardToken" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    if (idempotencyKey) {
      const existing = await tx.loyaltyRedemption.findUnique({ where: { idempotencyKey } });
      if (existing) {
        const account = await tx.loyaltyAccount.findUnique({ where: { id: existing.loyaltyAccountId } });
        return { ok: true as const, alreadyProcessed: true as const, stamps: account?.stamps ?? 0, rewardsRedeemed: account?.rewardsRedeemed ?? 0 };
      }
    }

    const settings =
      (await tx.loyaltyProgramSettings.findFirst()) ??
      (await tx.loyaltyProgramSettings.create({ data: {} }));
    const rewardStamps = Math.max(1, settings.rewardStamps);

    const account = await tx.loyaltyAccount.findFirst({ where: { cardToken } });
    if (!account) return { ok: false as const, error: "not_found" as const };

    if (account.stamps < rewardStamps) {
      return { ok: false as const, error: "not_enough_stamps" as const, rewardStamps, stamps: account.stamps, rewardsRedeemed: account.rewardsRedeemed };
    }

    const updated = await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: { stamps: { decrement: rewardStamps }, rewardsRedeemed: { increment: 1 } }
    });

    await tx.loyaltyRedemption.create({
      data: {
        loyaltyAccountId: updated.id,
        orderId: orderId || null,
        idempotencyKey: idempotencyKey || null,
        createdByStaffId: access.userId
      }
    });

    return { ok: true as const, alreadyProcessed: false as const, rewardStamps, stamps: updated.stamps, rewardsRedeemed: updated.rewardsRedeemed };
  });

  if (!result.ok) {
    if (result.error === "not_found") return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (result.error === "not_enough_stamps") {
      return NextResponse.json(
        { error: "Not enough stamps to redeem.", rewardStamps: result.rewardStamps, stamps: result.stamps, rewardsRedeemed: result.rewardsRedeemed },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Redeem failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, alreadyProcessed: result.alreadyProcessed, rewardStamps: (result as any).rewardStamps ?? null, stamps: result.stamps, rewardsRedeemed: result.rewardsRedeemed });
}

