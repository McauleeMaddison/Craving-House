import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/access";

export const dynamic = "force-dynamic";

function getTodayRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET() {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
    );
  }

  const { start, end } = getTodayRange();

  const [
    ordersToday,
    paidOrdersToday,
    liveQueueCount,
    collectedToday,
    loyaltyStampsToday,
    loyaltyRedemptionsToday
  ] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: start, lt: end } }
    }),
    prisma.order.count({
      where: { createdAt: { gte: start, lt: end }, paymentStatus: "paid" }
    }),
    prisma.order.count({
      where: {
        status: { in: ["received", "accepted", "ready"] },
        paymentStatus: "paid"
      }
    }),
    prisma.order.findMany({
      where: {
        collectedAt: { gte: start, lt: end },
        paymentStatus: "paid"
      },
      select: {
        createdAt: true,
        collectedAt: true
      }
    }),
    prisma.loyaltyStamp.count({
      where: { createdAt: { gte: start, lt: end } }
    }),
    prisma.loyaltyRedemption.count({
      where: { createdAt: { gte: start, lt: end } }
    })
  ]);

  const avgPrepMinutes =
    collectedToday.length > 0
      ? Math.round(
          collectedToday.reduce((sum, order) => {
            if (!order.collectedAt) return sum;
            const diffMs = order.collectedAt.getTime() - order.createdAt.getTime();
            return sum + Math.max(0, diffMs / 60000);
          }, 0) / collectedToday.length
        )
      : null;

  const conversionPct = ordersToday > 0 ? Math.round((paidOrdersToday / ordersToday) * 100) : null;

  return NextResponse.json({
    snapshotForDate: start.toISOString().slice(0, 10),
    ordersToday,
    paidOrdersToday,
    conversionPct,
    liveQueueCount,
    avgPrepMinutes,
    loyaltyStampsToday,
    loyaltyRedemptionsToday
  });
}
