import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/access";
import { createStripeCheckoutSession } from "@/server/stripe";
import { getClientIp, rateLimit } from "@/server/rate-limit";

type Body = {
  orderId: string;
};

function getBaseUrl(request: Request) {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) return configured;
  return request.headers.get("origin") ?? "http://localhost:3000";
}

export async function POST(request: Request) {
  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  const limited = rateLimit({ key: `payments:stripe:create-session:${access.userId}:${ip}`, limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

  const body = (await request.json()) as Partial<Body>;
  const orderId = String(body.orderId ?? "");
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: access.userId },
    include: { items: { include: { product: true } }, user: true }
  });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.paymentStatus === "paid") return NextResponse.json({ error: "already_paid" }, { status: 409 });

  const baseUrl = getBaseUrl(request);

  const session = await createStripeCheckoutSession({
    secretKey,
    baseUrl,
    orderId: order.id,
    customerEmail: order.user.email,
    lineItems: order.items.map((i) => ({
      name: i.product.name,
      unitAmountCents: i.unitCents,
      qty: i.qty
    }))
  });

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
