import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";
import { isSameOrigin } from "@/server/request-security";
import { decryptSecret } from "@/server/secret-box";
import { verifyTotp } from "@/server/totp";
import { getClientIp, rateLimit } from "@/server/rate-limit";

type Body = { code: string };

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireRole(["manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const ip = getClientIp(request);
  const limited = rateLimit({ key: `mfa:totp:disable:${access.userId}:${ip}`, limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  }

  const body = (await request.json().catch(() => null)) as Partial<Body> | null;
  const code = String(body?.code ?? "").trim();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: access.userId },
    select: { mfaTotpSecret: true, mfaTotpEnabledAt: true }
  });
  if (!user?.mfaTotpSecret || !user.mfaTotpEnabledAt) return NextResponse.json({ error: "not_enabled" }, { status: 409 });

  const secretBase32 = decryptSecret(user.mfaTotpSecret);
  const ok = verifyTotp({ secretBase32, token: code });
  if (!ok) return NextResponse.json({ error: "invalid_code" }, { status: 400 });

  await prisma.user.update({
    where: { id: access.userId },
    data: { mfaTotpSecret: null, mfaTotpEnabledAt: null }
  });

  return NextResponse.json({ ok: true });
}

