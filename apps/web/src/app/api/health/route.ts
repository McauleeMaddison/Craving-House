import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configured = process.env.NEXTAUTH_URL?.trim() || null;
  let canonicalOrigin: string | null = null;
  try {
    canonicalOrigin = configured ? new URL(configured).origin : null;
  } catch {
    canonicalOrigin = null;
  }

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    env: {
      nextauthUrlConfigured: Boolean(configured),
      nextauthSecretConfigured: Boolean(process.env.NEXTAUTH_SECRET),
      canonicalOrigin
    },
    request: {
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto")
    }
  });
}
