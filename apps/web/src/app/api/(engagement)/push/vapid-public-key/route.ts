import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ error: "Missing VAPID_PUBLIC_KEY" }, { status: 500 });
  return NextResponse.json({ publicKey: key });
}

