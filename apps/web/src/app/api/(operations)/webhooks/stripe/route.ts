import { NextResponse } from "next/server";

import { formatCustomizations } from "@/lib/drink-customizations";
import { prisma } from "@/server/db";
import { getClientIp } from "@/server/security/rate-limit";
import { getStripeRuntimeConfig, isStripeCheckoutSessionPaid, isStripeWebhookIpAllowed, verifyStripeWebhook } from "@/server/payments/stripe";
import { notifyStaffNewOrder } from "@/server/notifications/push";
import { isEmailConfigured, sendGuestOrderReceipt } from "@/server/notifications/email";
import { getConfiguredPublicOrigin } from "@/lib/public-url";
import { getDerivedOrderFeeCents } from "@/lib/order-pricing";
import { isValidStripeEvent } from "@/lib/type-safe-parsing";

export const dynamic = "force-dynamic";

async function markOrderPaid(params: { orderId: string; sessionId: string; paymentIntentId: string | null }) {
  const updated = await prisma.order.updateMany({
    // Customers can reopen checkout and complete an older still-valid session.
    where: { id: params.orderId, paymentStatus: { not: "paid" } },
    data: {
      paymentStatus: "paid",
      paidAt: new Date(),
      paymentProvider: "stripe",
      stripeCheckoutSessionId: params.sessionId,
      stripePaymentIntentId: params.paymentIntentId
    }
  });

  if (updated.count === 0) return;

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: { include: { product: true } } }
  });
  if (!order) return;

  const itemsSubtotalCents = order.items.reduce((sum, i) => sum + i.unitCents * i.qty, 0);
  const serviceFeeCents = getDerivedOrderFeeCents({ itemsSubtotalCents, totalCents: order.totalCents });
  try {
    await notifyStaffNewOrder({
      orderId: order.id,
      pickupName: order.pickupName,
      totalCents: order.totalCents
    });
  } catch (error) {
    console.error("Failed to send staff new-order push notification", error);
  }

  if (order.guestEmail && order.guestToken && isEmailConfigured()) {
    const baseUrl = getConfiguredPublicOrigin() || "";
    if (baseUrl) {
      const trackUrl = `${baseUrl}/orders/guest/${order.guestToken}`;
      const lines = order.items
        .map((i) => {
          const customizations = formatCustomizations(i.customizations);
          return `${i.qty}× ${i.product.name}${customizations ? ` (${customizations})` : ""} - £${((i.unitCents * i.qty) / 100).toFixed(2)}`;
        })
        .join("\n");
      const feeLine = serviceFeeCents > 0 ? `\nPickup small-order fee: £${(serviceFeeCents / 100).toFixed(2)}\n` : "\n";

      void sendGuestOrderReceipt({
        to: order.guestEmail,
        subject: "Your Craving House order",
        text: `Thanks for your order!\n\nPickup name: ${order.pickupName}\nTotal: £${(order.totalCents / 100).toFixed(2)}\n${feeLine}Items:\n${lines}\n\nTrack your order:\n${trackUrl}\n`
      }).catch((error) => {
        console.error("Failed to send guest order receipt", error);
      });
    }
  }
}

export async function POST(request: Request) {
  const { webhookSecret, webhookIpAllowlist } = getStripeRuntimeConfig();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const requestIp = getClientIp(request);
  if (!isStripeWebhookIpAllowed({ ip: requestIp, allowlist: webhookIpAllowlist })) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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

  // Use type-safe event validation instead of `as any`
  if (!isValidStripeEvent(verified.event)) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const event = verified.event;
  const type = String(event?.type ?? "");

  if (type === "checkout.session.completed") {
    const session = event.data.object as Record<string, unknown>;
    const metadata = session?.metadata as Record<string, unknown> | undefined;
    const orderId = String(metadata?.orderId ?? session?.client_reference_id ?? "");
    const sessionId = String(session?.id ?? "");
    const paymentIntentId = session?.payment_intent ? String(session.payment_intent) : null;
    if (!orderId || !sessionId) return NextResponse.json({ ok: true });

    if (isStripeCheckoutSessionPaid(session)) {
      await markOrderPaid({ orderId, sessionId, paymentIntentId });
    }
  }

  if (type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Record<string, unknown>;
    const metadata = session?.metadata as Record<string, unknown> | undefined;
    const orderId = String(metadata?.orderId ?? session?.client_reference_id ?? "");
    const sessionId = String(session?.id ?? "");
    const paymentIntentId = session?.payment_intent ? String(session.payment_intent) : null;
    if (orderId && sessionId) {
      await markOrderPaid({ orderId, sessionId, paymentIntentId });
    }
  }

  if (type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Record<string, unknown>;
    const metadata = session?.metadata as Record<string, unknown> | undefined;
    const orderId = String(metadata?.orderId ?? session?.client_reference_id ?? "");
    const sessionId = String(session?.id ?? "");
    const paymentIntentId = session?.payment_intent ? String(session.payment_intent) : null;
    if (orderId && sessionId) {
      await prisma.order.updateMany({
        where: { id: orderId, paymentStatus: { not: "paid" } },
        data: {
          paymentStatus: "failed",
          paymentProvider: "stripe",
          stripeCheckoutSessionId: sessionId,
          stripePaymentIntentId: paymentIntentId
        }
      });
    }
  }

  if (type === "checkout.session.expired") {
    const session = event.data.object as Record<string, unknown>;
    const metadata = session?.metadata as Record<string, unknown> | undefined;
    const orderId = String(metadata?.orderId ?? session?.client_reference_id ?? "");
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
