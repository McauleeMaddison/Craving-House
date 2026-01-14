import { NextResponse } from "next/server";

import { requireUser } from "@/server/access";
import { createCustomerQrToken } from "@/server/qr";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const secret = process.env.QR_SECRET;
  if (!secret) return NextResponse.json({ error: "Missing QR_SECRET" }, { status: 500 });

  const token = createCustomerQrToken({
    userId: access.userId,
    ttlSeconds: 60,
    secret
  });

  return NextResponse.json({ token, expiresInSeconds: 60 });
}
