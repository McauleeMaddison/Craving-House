import { NextResponse } from "next/server";

import { formatCustomizations } from "@/lib/drink-customizations";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/access";
import { createStripeCheckoutSession, getStripeRuntimeConfig } from "@/server/payments/stripe";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";
import { isSameOrigin } from "@/server/security/request-security";
import { getConfiguredPublicOrigin } from "@/lib/public-url";
import { getDerivedOrderFeeCents } from "@/lib/order-pricing";
import { sendOperationsAlert } from "@/server/monitoring/alerts";

type Body = {
  orderId: string;
  guestToken?: string;
};

function getBaseUrl(request: Request) {
  const requestOrigin = request.headers.get("origin")?.trim() || new URL(request.url).origin;
  if (process.env.NODE_ENV !== "production" && requestOrigin) return requestOrigin;

  const configured = getConfiguredPublicOrigin();
  if (configured) return configured;
  return requestOrigin || "http://localhost:3000";
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

  const { fake, secretKey } = getStripeRuntimeConfig();
  if (!fake && !secretKey) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

  const body = (await request.json()) as Partial<Body>;
  const orderId = String(body.orderId ?? "");
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

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

  if (fake) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProvider: "stripe_fake",
        paymentStatus: "paid",
        paidAt: new Date(),
        stripeCheckoutSessionId: `fake_${order.id}`
      }
    });
    return NextResponse.json({ url: `${baseUrl}${returnPath}?paid=1&via=fake-stripe` });
  }

  if (!secretKey) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  let session: { id: string; url: string };
  try {
    session = await createStripeCheckoutSession({
      secretKey,
      orderId: order.id,
      successUrl: `${baseUrl}${returnPath}?paid=1`,
      cancelUrl: `${baseUrl}${returnPath}?pay=cancelled`,
      customerEmail: order.user?.email ?? order.guestEmail ?? null,
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
    await sendOperationsAlert({
      area: "stripe_checkout_session",
      subject: "Stripe checkout session creation failed",
      message: "The app could not create a Stripe Checkout session for an order.",
      details: {
        orderId: order.id,
        userId: order.userId ?? null,
        guestEmail: order.guestEmail ?? null
      },
      error
    });
    return NextResponse.json(
      { error: "Unable to start card payment right now. Please try again shortly." },
      { status: 502 }
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentProvider: "stripe",
      paymentStatus: "pending",
      stripeCheckoutSessionId: session.id
    }
  });

  return NextResponse.json({ url: session.url });
}
