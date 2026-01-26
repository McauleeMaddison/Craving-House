import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/access";
import { isSameOrigin } from "@/server/request-security";

export const dynamic = "force-dynamic";

function newToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const account = await prisma.loyaltyAccount.upsert({
    where: { userId: access.userId },
    create: { userId: access.userId, stamps: 0, rewardsRedeemed: 0, cardToken: newToken() },
    update: { cardToken: newToken() }
  });

  return NextResponse.json({ cardToken: account.cardToken });
}

