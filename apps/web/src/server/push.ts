import webpush from "web-push";

import { prisma } from "@/server/db";

let configured = false;

function configureWebPush() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@localhost";
  if (!publicKey || !privateKey) {
    configured = true;
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
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

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any,
          payload
        );
      } catch (err: any) {
        const status = err?.statusCode ?? err?.status;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
        }
      }
    })
  );
}

export async function notifyCustomerOrderReady(params: { userId: string; orderId: string; pickupName: string }) {
  configureWebPush();
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: params.userId, user: { disabledAt: null } },
    select: { endpoint: true, p256dh: true, auth: true }
  });

  const payload = JSON.stringify({
    title: "Your order is ready",
    body: `${params.pickupName}, your coffee is ready to collect.`,
    data: { url: `/orders/${params.orderId}` }
  });

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any,
          payload
        );
      } catch (err: any) {
        const status = err?.statusCode ?? err?.status;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
        }
      }
    })
  );
}
