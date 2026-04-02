import { NextResponse } from "next/server";

import { formatCustomizations } from "@/lib/drink-customizations";
import { prisma } from "@/server/db";
import { getStripeRuntimeConfig, verifyStripeWebhook } from "@/server/stripe";
import { notifyStaffNewOrder } from "@/server/push";
import { isEmailConfigured, sendGuestOrderReceipt } from "@/server/email";
import { getConfiguredPublicOrigin } from "@/lib/public-url";
import { getDerivedOrderFeeCents } from "@/lib/order-pricing";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { webhookSecret } = getStripeRuntimeConfig();
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

    const updated = await prisma.order.updateMany({
      // Customers can reopen checkout and complete an older still-valid session.
      where: { id: orderId, paymentStatus: { not: "paid" } },
      data: {
        paymentStatus: "paid",
        paidAt: new Date(),
        paymentProvider: "stripe",
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId
      }
    });

    if (updated.count > 0) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } }
      });
      if (order) {
        const itemsSubtotalCents = order.items.reduce((sum, i) => sum + i.unitCents * i.qty, 0);
        const serviceFeeCents = getDerivedOrderFeeCents({ itemsSubtotalCents, totalCents: order.totalCents });
        void notifyStaffNewOrder({
          orderId: order.id,
          pickupName: order.pickupName,
          totalCents: order.totalCents
        });

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
    }
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
