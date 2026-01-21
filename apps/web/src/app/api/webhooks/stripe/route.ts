import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { verifyStripeWebhook } from "@/server/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  const verified = verifyStripeWebhook({
    rawBody,
    signatureHeader: signature,
    webhookSecret
  });
  if (!verified.ok) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const event = verified.event as any;
  const type = String(event?.type ?? "");

  if (type === "checkout.session.completed") {
    const session = event?.data?.object;
    const orderId = String(session?.metadata?.orderId ?? session?.client_reference_id ?? "");
    const sessionId = String(session?.id ?? "");
    const paymentIntentId = session?.payment_intent ? String(session.payment_intent) : null;
    if (!orderId || !sessionId) return NextResponse.json({ ok: true });

    await prisma.order.updateMany({
      where: { id: orderId, stripeCheckoutSessionId: sessionId },
      data: {
        paymentStatus: "paid",
        paidAt: new Date(),
        paymentProvider: "stripe",
        stripePaymentIntentId: paymentIntentId
      }
    });
  }

  if (type === "checkout.session.expired") {
    const session = event?.data?.object;
    const orderId = String(session?.metadata?.orderId ?? session?.client_reference_id ?? "");
    const sessionId = String(session?.id ?? "");
    if (orderId && sessionId) {
      await prisma.order.updateMany({
        where: { id: orderId, stripeCheckoutSessionId: sessionId, paymentStatus: "pending" },
        data: { paymentStatus: "unpaid" }
      });
    }
  }

  return NextResponse.json({ received: true });
}

