import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";

type Body = { status: "received" | "accepted" | "ready" | "collected" | "canceled" };

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const access = await requireRole(["staff", "manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const { orderId } = await context.params;
  const body = (await request.json()) as Partial<Body>;
  const status = body.status;
  if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

  const update: any = { status };
  if (status === "collected") update.collectedAt = new Date();

  await prisma.order.update({ where: { id: orderId }, data: update });
  return NextResponse.json({ ok: true });
}
