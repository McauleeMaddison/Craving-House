import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/access";
import { isSameOrigin } from "@/server/request-security";

export const dynamic = "force-dynamic";

type Body = {
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  deviceLabel?: string;
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ua = request.headers.get("user-agent") ?? null;
  const body = (await request.json()) as Partial<Body>;
  const endpoint = String(body.subscription?.endpoint ?? "");
  const p256dh = String(body.subscription?.keys?.p256dh ?? "");
  const auth = String(body.subscription?.keys?.auth ?? "");
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: access.userId,
      endpoint,
      p256dh,
      auth,
      userAgent: ua,
      deviceLabel: typeof body.deviceLabel === "string" ? body.deviceLabel.trim() : null,
      lastSeenAt: new Date()
    },
    update: {
      userId: access.userId,
      p256dh,
      auth,
      userAgent: ua,
      deviceLabel: typeof body.deviceLabel === "string" ? body.deviceLabel.trim() : undefined,
      lastSeenAt: new Date()
    }
  });

  return NextResponse.json({ ok: true });
}
