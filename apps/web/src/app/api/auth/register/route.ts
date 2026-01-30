import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { hashPassword, validatePasswordForSignup } from "@/server/password";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { isSameOrigin } from "@/server/request-security";

type RegisterBody = {
  email: string;
  password: string;
  name?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isReasonableEmail(email: string) {
  if (email.length < 3 || email.length > 254) return false;
  if (!email.includes("@")) return false;
  return true;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = getClientIp(request);
  const limited = rateLimit({ key: `auth:register:${ip}`, limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const body = (await request.json()) as Partial<RegisterBody>;
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!isReasonableEmail(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const passwordError = validatePasswordForSignup(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      name: name || null,
      role: "customer",
      passwordHash,
      loyaltyAccount: { create: {} }
    }
  });

  return NextResponse.json({ ok: true });
}
