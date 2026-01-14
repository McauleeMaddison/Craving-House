import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" }
  });
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
