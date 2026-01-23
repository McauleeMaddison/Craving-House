import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set(["received", "accepted", "ready", "collected", "canceled"]);

export async function GET(request: Request) {
  const access = await requireRole(["manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "").trim();
  const q = (searchParams.get("q") ?? "").trim();
  const limitRaw = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.round(limitRaw))) : 50;

  const where: any = {};
  if (status && VALID_STATUS.has(status)) where.status = status;
  if (q) {
    where.OR = [
      { pickupName: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } }
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { items: { include: { product: true } }, user: true }
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      createdAtIso: o.createdAt.toISOString(),
      status: o.status,
      paymentStatus: o.paymentStatus,
      paidAtIso: o.paidAt?.toISOString() ?? null,
      estimatedReadyAtIso: o.estimatedReadyAt?.toISOString() ?? null,
      collectedAtIso: o.collectedAt?.toISOString() ?? null,
      totalCents: o.totalCents,
      pickupName: o.pickupName,
      customerEmail: o.user.email ?? null,
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

