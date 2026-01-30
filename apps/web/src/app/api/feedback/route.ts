import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { prisma } from "@/server/db";
import { authOptions } from "@/server/auth";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { isSameOrigin } from "@/server/request-security";

export const dynamic = "force-dynamic";

type Body = {
  rating: number;
  message: string;
};

function clampRating(n: number) {
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function normalizeMessage(s: string) {
  return s.trim().replace(/\r\n/g, "\n");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = getClientIp(request);
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const limited = rateLimit({ key: `feedback:submit:${userId ?? "guest"}:${ip}`, limit: 8, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const body = (await request.json().catch(() => null)) as Partial<Body> | null;
  const rating = clampRating(Number(body?.rating ?? 5));
  const message = normalizeMessage(String(body?.message ?? ""));

  if (message.length < 3) return NextResponse.json({ error: "Message is too short." }, { status: 400 });
  if (message.length > 2500) return NextResponse.json({ error: "Message is too long (max 2500 characters)." }, { status: 400 });

  await prisma.feedback.create({
    data: {
      userId,
      rating,
      message
    }
  });

  return NextResponse.json({ ok: true });
}

