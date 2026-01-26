import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";
import { notifyCustomerOrderReady } from "@/server/push";
import { isSameOrigin } from "@/server/request-security";

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

  const update: any = { status };
  if (status === "collected") update.collectedAt = new Date();

  const updated = await prisma.order.update({ where: { id: orderId }, data: update });

  if (status === "ready" && updated.userId) {
    await notifyCustomerOrderReady({ userId: updated.userId, orderId: updated.id, pickupName: updated.pickupName });
  }

  return NextResponse.json({ ok: true });
}
