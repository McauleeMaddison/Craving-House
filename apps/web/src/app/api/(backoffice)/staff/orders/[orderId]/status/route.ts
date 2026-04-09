import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/access";
import { sendOperationsAlert } from "@/server/monitoring/alerts";
import { notifyCustomerOrderReady } from "@/server/notifications/push";
import { isSameOrigin } from "@/server/security/request-security";

type Body = { status: "received" | "accepted" | "ready" | "collected" | "canceled" };

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireRole(["staff", "manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const { orderId } = await context.params;
  const body = (await request.json()) as Partial<Body>;
  const status = body.status;
  if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

  try {
    const current = await prisma.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true }
    });
    if (!current) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (status !== "canceled" && current.paymentStatus !== "paid") {
      return NextResponse.json({ error: "Order has not been paid yet." }, { status: 409 });
    }

    const update: { status: Body["status"]; collectedAt?: Date } = { status };
    if (status === "collected") update.collectedAt = new Date();

    const updated = await prisma.order.update({ where: { id: orderId }, data: update });

    if (status === "ready" && updated.userId) {
      try {
        await notifyCustomerOrderReady({ userId: updated.userId, orderId: updated.id, pickupName: updated.pickupName });
      } catch (error) {
        await sendOperationsAlert({
          area: "staff_order_ready_notification",
          dedupeKey: `staff-order-ready:${updated.id}`,
          severity: "warning",
          subject: "Ready notification failed",
          message: "The order was marked ready but the customer push notification failed.",
          details: {
            actorUserId: access.userId,
            orderId: updated.id,
            pickupName: updated.pickupName,
            userId: updated.userId
          },
          error
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await sendOperationsAlert({
      area: "staff_order_status_update",
      dedupeKey: `staff-order-status:${orderId}:${status}`,
      severity: "critical",
      subject: "Staff order status update failed",
      message: "The app could not update an order status from the staff or manager queue.",
      details: {
        actorUserId: access.userId,
        orderId,
        requestedStatus: status
      },
      error
    });
    return NextResponse.json({ error: "Unable to update the order right now." }, { status: 500 });
  }
}
