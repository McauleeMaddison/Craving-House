import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/access";

export const dynamic = "force-dynamic";

type Body = {
  endpoint: string;
};

export async function POST(request: Request) {
  const access = await requireUser();
  if (!access.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<Body>;
  const endpoint = String(body.endpoint ?? "");
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: access.userId } });
  return NextResponse.json({ ok: true });
}
