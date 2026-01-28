import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
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
    }
  });
}
