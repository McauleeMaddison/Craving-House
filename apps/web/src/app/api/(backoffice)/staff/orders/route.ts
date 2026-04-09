import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireRole(["staff", "manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { status: { in: ["received", "accepted", "ready"] }, paymentStatus: "paid" },
        { status: { in: ["collected", "canceled"] } }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { items: { include: { product: true } } }
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      createdAtIso: o.createdAt.toISOString(),
      status: o.status,
      estimatedReadyAtIso: o.estimatedReadyAt?.toISOString() ?? null,
      totalCents: o.totalCents,
      pickupName: o.pickupName,
      paymentStatus: o.paymentStatus,
      lines: o.items.map((i) => ({
        itemId: i.productId,
        name: i.product.name,
        qty: i.qty,
        loyaltyEligible: i.product.loyaltyEligible,
        customizations: i.customizations ?? null
      }))
    }))
  });
}
