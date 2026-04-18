import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/access";
import { notifyCustomerOrderReady } from "@/server/notifications/push";
import { isSameOrigin } from "@/server/security/request-security";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";

type Body = { status: "received" | "accepted" | "ready" | "collected" | "canceled" };

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireRole(["staff", "manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const ip = getClientIp(request);
  const limited = await rateLimit({
    key: `staff:order-status:${access.userId}:${ip}`,
    limit: 120,
    windowMs: 60_000
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many status updates. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const { orderId } = await context.params;
  const body = (await request.json()) as Partial<Body>;
  const status = body.status;
  if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

  const current = await prisma.order.findUnique({
    where: { id: orderId },
    select: { paymentStatus: true }
  });
  if (!current) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (status !== "canceled" && current.paymentStatus !== "paid") {
    return NextResponse.json({ error: "Order has not been paid yet." }, { status: 409 });
  }

  const update: any = { status };
  if (status === "collected") update.collectedAt = new Date();

  const updated = await prisma.order.update({ where: { id: orderId }, data: update });

  if (status === "ready" && updated.userId) {
    await notifyCustomerOrderReady({ userId: updated.userId, orderId: updated.id, pickupName: updated.pickupName });
  }

  return NextResponse.json({ ok: true });
}
