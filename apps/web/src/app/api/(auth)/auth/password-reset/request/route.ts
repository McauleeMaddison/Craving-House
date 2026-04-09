import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  getPasswordResetIdentifier,
  getPasswordResetExpiry,
  getPasswordResetTtlMinutes,
  hashPasswordResetToken,
  isReasonablePasswordResetEmail,
  normalizePasswordResetEmail
} from "@/server/auth/password-reset";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";
import { isSameOrigin } from "@/server/security/request-security";
import { isEmailConfigured, sendPasswordResetEmail } from "@/server/notifications/email";
import { sendOperationsAlert } from "@/server/monitoring/alerts";

type PasswordResetRequestBody = {
  email: string;
};

const SUCCESS_RESPONSE = {
  ok: true,
  message: "If that email can be reset, we'll send a link shortly."
} as const;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = getClientIp(request);
  const limited = await rateLimit({ key: `auth:password-reset:request:${ip}`, limit: 5, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many password reset requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const body = (await request.json().catch(() => null)) as Partial<PasswordResetRequestBody> | null;
  const email = normalizePasswordResetEmail(String(body?.email ?? ""));
  if (!isReasonablePasswordResetEmail(email)) {
    return NextResponse.json(SUCCESS_RESPONSE);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, disabledAt: true }
  });
  if (!user || user.disabledAt) {
    return NextResponse.json(SUCCESS_RESPONSE);
  }

  const rawToken = createPasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const ttlMinutes = getPasswordResetTtlMinutes();
  const identifier = getPasswordResetIdentifier(email);
  const resetUrl = buildPasswordResetUrl({
    email,
    token: rawToken,
    requestOrigin: request.headers.get("origin")
  });

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: {
        identifier,
        token: tokenHash,
        expires: getPasswordResetExpiry(new Date(), ttlMinutes)
      }
    })
  ]);

  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ...SUCCESS_RESPONSE, debugResetUrl: resetUrl });
    }

    return NextResponse.json(
      { error: "Password reset email is not configured right now." },
      { status: 503 }
    );
  }

  try {
    await sendPasswordResetEmail({
      to: email,
      resetUrl,
      ttlMinutes
    });
  } catch (error) {
    await sendOperationsAlert({
      area: "password_reset_request",
      subject: "Password reset email failed",
      message: "A password reset email could not be sent.",
      details: { email },
      error
    });
    return NextResponse.json(
      { error: "Unable to send a password reset email right now. Please try again shortly." },
      { status: 502 }
    );
  }

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ...SUCCESS_RESPONSE, debugResetUrl: resetUrl });
  }

  return NextResponse.json(SUCCESS_RESPONSE);
}
