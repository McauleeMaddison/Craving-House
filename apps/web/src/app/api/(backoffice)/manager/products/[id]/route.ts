import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/access";
import { isSameOrigin } from "@/server/security/request-security";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";

type PatchBody = Partial<{
  name: string;
  description: string | null;
  priceCents: number;
  available: boolean;
  prepSeconds: number;
  loyaltyEligible: boolean;
}>;

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireRole(["manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const ip = getClientIp(request);
  const limited = await rateLimit({
    key: `manager:products:update:${access.userId}:${ip}`,
    limit: 40,
    windowMs: 60_000
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many product changes. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const { id } = await context.params;
  const body = (await request.json()) as PatchBody;

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: body.name?.trim(),
      description: body.description === null ? null : body.description?.trim(),
      priceCents: body.priceCents === undefined ? undefined : Math.round(body.priceCents),
      available: body.available,
      prepSeconds: body.prepSeconds === undefined ? undefined : Math.max(0, Math.round(body.prepSeconds)),
      loyaltyEligible: body.loyaltyEligible
    }
  });

  return NextResponse.json({ id: updated.id });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
    );
  }

  const ip = getClientIp(request);
  const limited = await rateLimit({
    key: `manager:products:delete:${access.userId}:${ip}`,
    limit: 20,
    windowMs: 60_000
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many product changes. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const { id } = await context.params;

  const usage = await prisma.orderItem.count({ where: { productId: id } });
  if (usage > 0) {
    return NextResponse.json(
      { error: "This product has been ordered before. You can’t delete it; set Available = off instead." },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
