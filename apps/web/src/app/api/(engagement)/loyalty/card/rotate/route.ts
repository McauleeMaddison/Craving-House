import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/access";
import { isSameOrigin } from "@/server/security/request-security";

export const dynamic = "force-dynamic";
const MAX_TOKEN_ATTEMPTS = 6;

function newToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let account = null;
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt += 1) {
    try {
      const token = newToken();
      account = await prisma.loyaltyAccount.upsert({
        where: { userId: access.userId },
        create: { userId: access.userId, stamps: 0, rewardsRedeemed: 0, cardToken: token },
        update: { cardToken: token }
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

  return NextResponse.json({ cardToken: account.cardToken });
}
