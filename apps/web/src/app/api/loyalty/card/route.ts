import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/access";

export const dynamic = "force-dynamic";

function newToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const account = await prisma.loyaltyAccount.upsert({
    where: { userId: access.userId },
    create: { userId: access.userId, stamps: 0, rewardsRedeemed: 0, cardToken: newToken() },
    update: {}
  });

  if (account.cardToken) {
    return NextResponse.json({ cardToken: account.cardToken });
  }

  // Backfill if account exists but token missing.
  const updated = await prisma.loyaltyAccount.update({
    where: { id: account.id },
    data: { cardToken: newToken() }
  });

  return NextResponse.json({ cardToken: updated.cardToken });
}

