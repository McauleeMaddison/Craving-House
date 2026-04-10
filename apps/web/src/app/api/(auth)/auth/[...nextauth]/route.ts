import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/server/auth/config";
import { formatTooManyAttemptsError, getCredentialSignInBlockStatus, rateLimitCredentialSignInRequest } from "@/server/auth/rate-limit";
import { getClientIp } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

async function extractCredentialEmail(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const cloned = request.clone();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await cloned.formData();
    return String(form.get("email") ?? "").trim().toLowerCase();
  }

  if (contentType.includes("application/json")) {
    const json = (await cloned.json().catch(() => null)) as Record<string, unknown> | null;
    return String(json?.email ?? "").trim().toLowerCase();
  }

  return "";
}

function buildTooManyAttemptsResponse(request: Request, retryAfterSeconds: number) {
  const url = new URL("/signin", request.url);
  url.searchParams.set("error", formatTooManyAttemptsError(retryAfterSeconds));

  return NextResponse.json(
    { url: url.toString() },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith("/callback/credentials")) {
    const ip = getClientIp(request);
    const requestLimit = await rateLimitCredentialSignInRequest({ ip });
    if (!requestLimit.ok) {
      return buildTooManyAttemptsResponse(request, requestLimit.retryAfterSeconds);
    }

    const email = await extractCredentialEmail(request);
    const blocked = await getCredentialSignInBlockStatus({ email, ip });
    if (blocked.blocked) {
      return buildTooManyAttemptsResponse(request, blocked.retryAfterSeconds);
    }
  }

  return handler(request);
}

export { handler as GET };
