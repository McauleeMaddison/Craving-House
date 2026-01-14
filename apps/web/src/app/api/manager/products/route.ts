import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";

type CreateBody = {
  name: string;
  description?: string;
  priceCents: number;
  available?: boolean;
  prepSeconds?: number;
  loyaltyEligible?: boolean;
};

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireRole(["manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      priceCents: p.priceCents,
      available: p.available,
      prepSeconds: p.prepSeconds,
      loyaltyEligible: p.loyaltyEligible
    }))
  });
}

export async function POST(request: Request) {
  const access = await requireRole(["manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const body = (await request.json()) as Partial<CreateBody>;
  if (!body.name?.trim()) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  if (!Number.isFinite(body.priceCents) || (body.priceCents ?? 0) < 0) {
    return NextResponse.json({ error: "Invalid priceCents" }, { status: 400 });
  }
  const priceCents = Math.round(body.priceCents as number);

  const created = await prisma.product.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      priceCents,
      available: body.available ?? true,
      prepSeconds: Math.max(0, Math.round(body.prepSeconds ?? 0)),
      loyaltyEligible: body.loyaltyEligible ?? false
    }
  });

  return NextResponse.json({ id: created.id });
}
