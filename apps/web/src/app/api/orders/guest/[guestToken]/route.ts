import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ guestToken: string }> }) {
  const { guestToken } = await context.params;
  const token = String(guestToken ?? "").trim();
  if (!token) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const order = await prisma.order.findFirst({
    where: { guestToken: token },
    include: { items: { include: { product: true } } }
  });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    id: order.id,
    guestToken: order.guestToken,
    createdAtIso: order.createdAt.toISOString(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    paidAtIso: order.paidAt?.toISOString() ?? null,
    estimatedReadyAtIso: order.estimatedReadyAt?.toISOString() ?? null,
    collectedAtIso: order.collectedAt?.toISOString() ?? null,
    totalCents: order.totalCents,
    pickupName: order.pickupName,
    notes: order.notes ?? null,
    lines: order.items.map((i) => ({
      itemId: i.productId,
      name: i.product.name,
      qty: i.qty,
      unitPriceCents: i.unitCents,
      prepSeconds: i.product.prepSeconds,
      loyaltyEligible: i.product.loyaltyEligible,
      customizations: i.customizations ?? null
    }))
  });
}

