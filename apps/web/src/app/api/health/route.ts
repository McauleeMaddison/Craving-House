import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { prisma } from "@/server/db";
import { authOptions } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configured = process.env.NEXTAUTH_URL?.trim() || null;
  let canonicalOrigin: string | null = null;
  try {
    canonicalOrigin = configured ? new URL(configured).origin : null;
  } catch {
    canonicalOrigin = null;
  }

  let db = { ok: true as const };
  try {
    // Basic connectivity check. If this fails, sign-in/session will not work.
    await prisma.user.count({ take: 1 });
  } catch (err: any) {
    db = { ok: false as const, error: String(err?.code || err?.name || "db_error") } as any;
  }

  let sessionInfo: { ok: true; signedIn: boolean; role?: string } | { ok: false; error: string };
  try {
    const session = await getServerSession(authOptions);
    sessionInfo = {
      ok: true,
      signedIn: Boolean(session?.user?.id),
      role: (session?.user as any)?.role
    };
  } catch (err: any) {
    sessionInfo = { ok: false, error: String(err?.name || "session_error") };
  }

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    db,
    session: sessionInfo,
    env: {
      nextauthUrlConfigured: Boolean(configured),
      nextauthSecretConfigured: Boolean(process.env.NEXTAUTH_SECRET),
      canonicalOrigin,
      googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      devAuthEnabled:
        process.env.DEV_AUTH_ENABLED === "true" || process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true"
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
