import { NextResponse } from "next/server";

import { formatCustomizations } from "@/lib/drink-customizations";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/access";
import { createStripeCheckoutSession, ensureStripeCustomer, getStripeRuntimeConfig } from "@/server/payments/stripe";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";
import { isSameOrigin } from "@/server/security/request-security";
import { getConfiguredPublicOrigin } from "@/lib/public-url";
import { getDerivedOrderFeeCents } from "@/lib/order-pricing";
import { recordApiErrorEvent, recordAuditEvent } from "@/server/monitoring/events";

type Body = {
  orderId: string;
  guestToken?: string;
  express?: boolean;
};

function getBaseUrl(request: Request) {
  const configured = getConfiguredPublicOrigin();
  if (configured) return configured;
  return request.headers.get("origin") ?? "http://localhost:3000";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireUser();

  const ip = getClientIp(request);
  const limited = await rateLimit({
    key: `payments:stripe:create-session:${access.ok ? access.userId : "guest"}:${ip}`,
    limit: 20,
    windowMs: 60_000
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const { secretKey } = getStripeRuntimeConfig();
  if (!secretKey) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

  const body = (await request.json()) as Partial<Body>;
  const orderId = String(body.orderId ?? "");
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  const express = Boolean(body.express);

  const guestToken = typeof body.guestToken === "string" ? body.guestToken.trim() : "";
  if (!access.ok && !guestToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const order = await prisma.order.findFirst({
    where: access.ok ? { id: orderId, userId: access.userId } : { id: orderId, guestToken },
    include: { items: { include: { product: true } }, user: true }
  });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.paymentStatus === "paid") return NextResponse.json({ error: "already_paid" }, { status: 409 });

  const baseUrl = getBaseUrl(request);
  const returnPath = order.guestToken ? `/orders/guest/${order.guestToken}` : `/orders/${order.id}`;
  const itemsSubtotalCents = order.items.reduce((sum, i) => sum + i.unitCents * i.qty, 0);
  const serviceFeeCents = getDerivedOrderFeeCents({ itemsSubtotalCents, totalCents: order.totalCents });

  let stripeCustomerId: string | null = null;
  let session: { id: string; url: string };
  try {
    const customer = await ensureStripeCustomer({
      secretKey,
      stripeCustomerId: order.user?.stripeCustomerId ?? order.stripeCustomerId ?? null,
      email: order.user?.email ?? order.guestEmail ?? null,
      name: order.user?.name ?? order.pickupName,
      metadata: access.ok && order.userId ? { userId: order.userId } : { orderId: order.id, guestOrder: "true" }
    });
    stripeCustomerId = customer.id;

    session = await createStripeCheckoutSession({
      secretKey,
      orderId: order.id,
      successUrl: `${baseUrl}${returnPath}?paid=1`,
      cancelUrl: `${baseUrl}${returnPath}?pay=cancelled`,
      customerId: stripeCustomerId,
      allowSavedPaymentMethods: Boolean(access.ok && stripeCustomerId),
      allowBankTransfers: true,
      preferExpressWallets: express,
      lineItems: [
        ...order.items.map((i) => ({
          name: formatCustomizations(i.customizations)
            ? `${i.product.name} (${formatCustomizations(i.customizations)})`
            : i.product.name,
          unitAmountCents: i.unitCents,
          qty: i.qty
        })),
        ...(serviceFeeCents > 0
          ? [{ name: "Pickup small-order fee", unitAmountCents: serviceFeeCents, qty: 1 }]
          : [])
      ]
    });
  } catch (error) {
    console.error("Failed to create Stripe Checkout session", error);
    void recordApiErrorEvent({
      area: "commerce.payments",
      action: "create_stripe_session",
      severity: "critical",
      userId: access.ok ? access.userId : null,
      message: "Failed to create Stripe Checkout session",
      details: { orderId },
      error
    });
    return NextResponse.json(
      { error: "Unable to start Stripe payment right now. Please try again shortly." },
      { status: 502 }
    );
  }

  await prisma.$transaction(async (tx) => {
    if (stripeCustomerId && order.userId && order.user?.stripeCustomerId !== stripeCustomerId) {
      await tx.user.update({
        where: { id: order.userId },
        data: { stripeCustomerId }
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentProvider: "stripe",
        paymentStatus: "pending",
        stripeCheckoutSessionId: session.id,
        stripeCustomerId
      }
    });
  });

  void recordAuditEvent({
    area: "commerce.payments",
    action: "start_checkout",
    userId: access.ok ? access.userId : null,
    message: "Checkout session created",
    details: {
      orderId: order.id,
      express,
      signedIn: access.ok
    }
  });

  return NextResponse.json({ url: session.url });
}
