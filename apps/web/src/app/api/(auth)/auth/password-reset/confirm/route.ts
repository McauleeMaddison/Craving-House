import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { hashPassword, validatePasswordForSignup } from "@/server/auth/password";
import { getPasswordResetIdentifier, hashPasswordResetToken, normalizePasswordResetEmail } from "@/server/auth/password-reset";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";
import { isSameOrigin } from "@/server/security/request-security";

type PasswordResetConfirmBody = {
  email: string;
  password: string;
  token: string;
};

const INVALID_TOKEN_ERROR = "This password reset link is invalid or has expired.";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = getClientIp(request);
  const limited = await rateLimit({ key: `auth:password-reset:confirm:${ip}`, limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many password reset attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const body = (await request.json().catch(() => null)) as Partial<PasswordResetConfirmBody> | null;
  const email = normalizePasswordResetEmail(String(body?.email ?? ""));
  const identifier = getPasswordResetIdentifier(email);
  const token = String(body?.token ?? "").trim();
  const password = String(body?.password ?? "");
  const passwordError = validatePasswordForSignup(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }
  if (!email || !token) {
    return NextResponse.json({ error: INVALID_TOKEN_ERROR }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashPasswordResetToken(token) }
  });
  if (!record || record.identifier !== identifier || record.expires <= new Date()) {
    if (record && record.expires <= new Date()) {
      await prisma.verificationToken.deleteMany({ where: { identifier } });
    }
    return NextResponse.json({ error: INVALID_TOKEN_ERROR }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, disabledAt: true }
  });
  if (!user || user.disabledAt) {
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    return NextResponse.json({ error: INVALID_TOKEN_ERROR }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    }),
    prisma.verificationToken.deleteMany({ where: { identifier } })
  ]);

  return NextResponse.json({ ok: true });
}
