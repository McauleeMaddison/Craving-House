import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/access";
import { getProductCustomizationKind, normalizeCustomizations } from "@/lib/drink-customizations";
import { calculatePrepSeconds } from "@/lib/prep-time";
import { getLineUnitPriceCents, getPickupSmallOrderFeeCents } from "@/lib/order-pricing";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { isSameOrigin } from "@/server/request-security";
import { getStripeRuntimeConfig } from "@/server/stripe";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

type CreateOrderBody = {
  pickupName: string;
  guestEmail?: string;
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
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const stripeEnabled = getStripeRuntimeConfig().enabled;
  if (!stripeEnabled) {
    return NextResponse.json(
      { error: "Card payments are currently unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const access = await requireUser();
  const rateKey = access.ok ? `orders:create:${access.userId}:${ip}` : `orders:create:guest:${ip}`;
  const limited = rateLimit({ key: rateKey, limit: access.ok ? 30 : 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const body = (await request.json()) as Partial<CreateOrderBody>;
  if (!body.pickupName?.trim()) return NextResponse.json({ error: "Missing pickupName" }, { status: 400 });
  const guestEmail = typeof body.guestEmail === "string" ? body.guestEmail.trim().toLowerCase() : "";
  if (!access.ok) {
    if (!guestEmail || !guestEmail.includes("@")) {
      return NextResponse.json({ error: "Email is required for guest checkout." }, { status: 400 });
    }
  }
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

  const pricedItems = items.map((i) => {
    const product = productById.get(i.productId)!;
    const cleanedCustomizations = getProductCustomizationKind(product)
      ? normalizeCustomizations(i.customizations)
      : null;

    return {
      ...i,
      customizations: cleanedCustomizations,
      unitCents: getLineUnitPriceCents(product.priceCents, cleanedCustomizations)
    };
  });

  const itemsSubtotalCents = pricedItems.reduce((sum, i) => sum + i.qty * i.unitCents, 0);
  const totalCents = itemsSubtotalCents + getPickupSmallOrderFeeCents(itemsSubtotalCents);
  const prepSeconds = calculatePrepSeconds({
    baseSeconds: 120,
    items: items.map((i) => ({ qty: i.qty, prepSeconds: productById.get(i.productId)!.prepSeconds }))
  });
  const estimatedReadyAt = new Date(Date.now() + prepSeconds * 1000);

  const guestToken = !access.ok ? crypto.randomBytes(24).toString("base64url") : null;

  const created = await prisma.order.create({
    data: {
      userId: access.ok ? access.userId : null,
      guestEmail: access.ok ? null : guestEmail,
      guestToken,
      status: "received",
      totalCents,
      estimatedReadyAt,
      pickupName: body.pickupName.trim(),
      notes: body.notes?.trim() || null,
      items: {
        create: pricedItems.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitCents: i.unitCents,
          customizations: i.customizations ?? undefined
        }))
      }
    },
    include: { items: { include: { product: true } } }
  });

  return NextResponse.json({ id: created.id, guestToken: created.guestToken ?? null });
}
