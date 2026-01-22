import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/access";
import { calculatePrepSeconds } from "@/lib/prep-time";

export const dynamic = "force-dynamic";

type CreateOrderBody = {
  pickupName: string;
  notes?: string;
  items: Array<{ productId: string; qty: number; customizations?: unknown }>;
};

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: access.userId },
    orderBy: { createdAt: "desc" },
    include: { items: true }
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      createdAtIso: o.createdAt.toISOString(),
      status: o.status,
      paymentStatus: o.paymentStatus,
      paidAtIso: o.paidAt?.toISOString() ?? null,
      pickupTimeIso: o.pickupTime?.toISOString() ?? null,
      estimatedReadyAtIso: o.estimatedReadyAt?.toISOString() ?? null,
      totalCents: o.totalCents,
      pickupName: o.pickupName,
      notes: o.notes ?? null,
      items: o.items.map((i) => ({ productId: i.productId, qty: i.qty, unitCents: i.unitCents }))
    }))
  });
}

export async function POST(request: Request) {
  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<CreateOrderBody>;
  if (!body.pickupName?.trim()) return NextResponse.json({ error: "Missing pickupName" }, { status: 400 });
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Missing items" }, { status: 400 });
  }

  const items = body.items
    .map((x) => ({ productId: String(x.productId), qty: Number(x.qty), customizations: (x as any)?.customizations }))
    .filter((x) => x.productId && Number.isFinite(x.qty) && x.qty > 0);
  if (items.length === 0) return NextResponse.json({ error: "Invalid items" }, { status: 400 });

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const i of items) {
    const p = productById.get(i.productId);
    if (!p) return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    if (!p.available) return NextResponse.json({ error: `Unavailable: ${p.name}` }, { status: 409 });
  }

  const totalCents = items.reduce((sum, i) => sum + i.qty * (productById.get(i.productId)!.priceCents ?? 0), 0);
  const prepSeconds = calculatePrepSeconds({
    baseSeconds: 120,
    items: items.map((i) => ({ qty: i.qty, prepSeconds: productById.get(i.productId)!.prepSeconds }))
  });
  const estimatedReadyAt = new Date(Date.now() + prepSeconds * 1000);

  const created = await prisma.order.create({
    data: {
      userId: access.userId,
      status: "received",
      totalCents,
      estimatedReadyAt,
      pickupName: body.pickupName.trim(),
      notes: body.notes?.trim() || null,
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitCents: productById.get(i.productId)!.priceCents,
          customizations: i.customizations ?? undefined
        }))
      }
    }
  });

  return NextResponse.json({ id: created.id });
}
