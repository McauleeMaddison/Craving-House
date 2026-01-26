import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";
import { isSameOrigin } from "@/server/request-security";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { buildTotpAuthUrl, generateTotpSecretBase32 } from "@/server/totp";
import { encryptSecret } from "@/server/secret-box";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireRole(["manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const ip = getClientIp(request);
  const limited = rateLimit({ key: `mfa:totp:setup:${access.userId}:${ip}`, limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  }

  const user = await prisma.user.findUnique({
    where: { id: access.userId },
    select: { email: true, mfaTotpEnabledAt: true }
  });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.mfaTotpEnabledAt) return NextResponse.json({ error: "already_enabled" }, { status: 409 });

  const secretBase32 = generateTotpSecretBase32();
  const otpauthUrl = buildTotpAuthUrl({
    issuer: "Craving House",
    accountLabel: user.email ?? "manager",
    secretBase32
  });
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=220x220&chl=${encodeURIComponent(otpauthUrl)}`;

  await prisma.user.update({
    where: { id: access.userId },
    data: {
      mfaTotpSecret: encryptSecret(secretBase32),
      mfaTotpEnabledAt: null
    }
  });

  return NextResponse.json({ secretBase32, otpauthUrl, qrUrl });
}

