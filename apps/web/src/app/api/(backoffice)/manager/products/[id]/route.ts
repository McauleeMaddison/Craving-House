import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/access";
import { isSameOrigin } from "@/server/security/request-security";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";
import { recordAuditEvent } from "@/server/monitoring/events";

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
  const existing = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      available: true,
      prepSeconds: true,
      loyaltyEligible: true
    }
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updates: PatchBody = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
    updates.name = name;
  }
  if (body.description !== undefined) {
    const description = body.description === null ? null : body.description.trim();
    updates.description = description || null;
  }
  if (body.priceCents !== undefined) {
    if (!Number.isFinite(body.priceCents) || body.priceCents < 0) {
      return NextResponse.json({ error: "Invalid priceCents" }, { status: 400 });
    }
    updates.priceCents = Math.round(body.priceCents);
  }
  if (body.prepSeconds !== undefined) {
    if (!Number.isFinite(body.prepSeconds) || body.prepSeconds < 0) {
      return NextResponse.json({ error: "Invalid prepSeconds" }, { status: 400 });
    }
    updates.prepSeconds = Math.max(0, Math.round(body.prepSeconds));
  }
  if (typeof body.available === "boolean") {
    updates.available = body.available;
  }
  if (typeof body.loyaltyEligible === "boolean") {
    updates.loyaltyEligible = body.loyaltyEligible;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: updates
  });

  void recordAuditEvent({
    area: "manager.products",
    action: "update",
    userId: access.userId,
    message: "Manager updated product",
    details: {
      productId: updated.id,
      before: existing,
      after: {
        name: updated.name,
        description: updated.description,
        priceCents: updated.priceCents,
        available: updated.available,
        prepSeconds: updated.prepSeconds,
        loyaltyEligible: updated.loyaltyEligible
      }
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
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true }
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const usage = await prisma.orderItem.count({ where: { productId: id } });
  if (usage > 0) {
    return NextResponse.json(
      { error: "This product has been ordered before. You can’t delete it; set Available = off instead." },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id } });
  void recordAuditEvent({
    area: "manager.products",
    action: "delete",
    userId: access.userId,
    message: "Manager deleted product",
    details: {
      productId: existing.id,
      name: existing.name
    }
  });
  return NextResponse.json({ ok: true });
}
