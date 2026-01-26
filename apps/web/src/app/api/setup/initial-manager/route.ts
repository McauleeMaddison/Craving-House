import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { prisma } from "@/server/db";
import { authOptions } from "@/server/auth";
import { getClientIp, rateLimit } from "@/server/rate-limit";

type Body = { setupCode: string };

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit({ key: `setup:initial-manager:${ip}`, limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const envCode = process.env.INITIAL_MANAGER_SETUP_CODE;
  if (!envCode || envCode.length < 12) {
    return NextResponse.json(
      { error: "Server is missing INITIAL_MANAGER_SETUP_CODE" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as Partial<Body>;
  const setupCode = body.setupCode?.trim();
  if (!setupCode) {
    return NextResponse.json({ error: "Missing setupCode" }, { status: 400 });
  }
  if (setupCode !== envCode) {
    return NextResponse.json({ error: "Invalid setup code" }, { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const managerCount = await tx.user.count({ where: { role: "manager" } });
    if (managerCount > 0) {
      return { ok: false as const, reason: "already_configured" as const };
    }

    await tx.user.update({
      where: { id: userId },
      data: { role: "manager" }
    });

    return { ok: true as const };
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Already configured" },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
