import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { hashPassword, validatePasswordForSignup } from "@/server/auth/password";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";
import { isSameOrigin } from "@/server/security/request-security";

type RegisterBody = {
  email: string;
  password: string;
  name?: string;
};

type RegisterErrorCode = "InvalidEmail" | "InvalidPassword" | "SignInInstead" | "TooManyRequests";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isReasonableEmail(email: string) {
  if (email.length < 3 || email.length > 254) return false;
  if (!email.includes("@")) return false;
  return true;
}

function errorResponse(code: RegisterErrorCode, error: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ code, error }, { status, headers });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = getClientIp(request);
  const limited = await rateLimit({ key: `auth:register:${ip}`, limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return errorResponse(
      "TooManyRequests",
      "Too many sign-up attempts. Please wait a moment and try again.",
      429,
      { "Retry-After": String(limited.retryAfterSeconds) }
    );
  }

  const body = (await request.json()) as Partial<RegisterBody>;
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!isReasonableEmail(email)) {
    return errorResponse("InvalidEmail", "Enter a valid email address.", 400);
  }

  const passwordError = validatePasswordForSignup(password);
  if (passwordError) {
    return errorResponse("InvalidPassword", passwordError, 400);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return errorResponse("SignInInstead", "We couldn't create that account. Sign in instead if you already have one.", 409);
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
