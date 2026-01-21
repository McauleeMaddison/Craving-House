import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole, requireUser } from "@/server/access";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;

  const userAccess = await requireUser();
  if (!userAccess.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const staffAccess = await requireRole(["staff", "manager"]);
  const where =
    staffAccess.ok ? { id: orderId } : { id: orderId, userId: userAccess.userId };

  const order = await prisma.order.findFirst({
    where,
    include: { items: { include: { product: true } } }
  });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    id: order.id,
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
      loyaltyEligible: i.product.loyaltyEligible
    }))
  });
}
