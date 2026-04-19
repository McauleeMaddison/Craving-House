import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/access";

export const dynamic = "force-dynamic";
const MAX_TOKEN_ATTEMPTS = 6;

function newToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function setCardTokenWithRetry(accountId: string) {
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.loyaltyAccount.update({
        where: { id: accountId },
        data: { cardToken: newToken() }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) continue;
      throw error;
    }
  }
  throw new Error("Could not allocate unique loyalty card token.");
}

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let account = null;
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt += 1) {
    try {
      account = await prisma.loyaltyAccount.upsert({
        where: { userId: access.userId },
        create: { userId: access.userId, stamps: 0, rewardsRedeemed: 0, cardToken: newToken() },
        update: {}
      });
      break;
    } catch (error) {
      if (isUniqueConstraintError(error)) continue;
      throw error;
    }
  }

  if (!account) {
    return NextResponse.json({ error: "Could not allocate loyalty card token." }, { status: 503 });
  }

  if (account.cardToken) {
    return NextResponse.json({ cardToken: account.cardToken });
  }

  // Backfill if account exists but token missing.
  const updated = await setCardTokenWithRetry(account.id);

  return NextResponse.json({ cardToken: updated.cardToken });
}
