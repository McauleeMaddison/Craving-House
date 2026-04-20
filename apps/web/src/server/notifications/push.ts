import webpush from "web-push";

import { prisma } from "@/server/db";
import { getConfiguredVapidSubject } from "@/lib/public-url";

type PushSubscriptionVapid = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type CustomerOrderStatus = "received" | "accepted" | "ready" | "collected" | "canceled";

let configured = false;

function configureWebPush() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = getConfiguredVapidSubject();
  if (!publicKey || !privateKey) {
    configured = true;
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

async function sendPushToSubscriptions(subs: StoredPushSubscription[], payload: string) {
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        const subscription: PushSubscriptionVapid = {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth }
        };
        await webpush.sendNotification(subscription, payload);
      } catch (err: any) {
        const status = err?.statusCode ?? err?.status;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
        }
      }
    })
  );
}

export async function notifyStaffNewOrder(params: { orderId: string; pickupName: string; totalCents: number }) {
  configureWebPush();
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { user: { role: { in: ["staff", "manager"] }, disabledAt: null } },
    select: { endpoint: true, p256dh: true, auth: true }
  });

  const payload = JSON.stringify({
    title: "New order received",
    body: `${params.pickupName} • £${(params.totalCents / 100).toFixed(2)}`,
    data: { url: "/staff/orders" }
  });

  await sendPushToSubscriptions(subs, payload);
}

function getCustomerStatusNotification(status: CustomerOrderStatus, pickupName: string) {
  switch (status) {
    case "accepted":
      return {
        title: "Order accepted",
        body: `${pickupName}, we’ve started preparing your order.`
      };
    case "ready":
      return {
        title: "Your order is ready",
        body: `${pickupName}, your order is ready to collect.`
      };
    case "collected":
      return {
        title: "Order collected",
        body: `${pickupName}, your order was marked as collected.`
      };
    case "canceled":
      return {
        title: "Order update",
        body: `${pickupName}, your order was canceled.`
      };
    case "received":
    default:
      return {
        title: "Order received",
        body: `${pickupName}, we’ve received your order.`
      };
  }
}

export async function notifyCustomerOrderStatus(params: {
  userId: string;
  orderId: string;
  pickupName: string;
  status: CustomerOrderStatus;
}) {
  configureWebPush();
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: params.userId, user: { disabledAt: null } },
    select: { endpoint: true, p256dh: true, auth: true }
  });

  const content = getCustomerStatusNotification(params.status, params.pickupName);
  const payload = JSON.stringify({
    title: content.title,
    body: content.body,
    data: { url: `/orders/${params.orderId}` }
  });

  await sendPushToSubscriptions(subs, payload);
}

export async function notifyCustomerOrderReady(params: { userId: string; orderId: string; pickupName: string }) {
  await notifyCustomerOrderStatus({ ...params, status: "ready" });
}
