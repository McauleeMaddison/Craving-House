import { NextResponse } from "next/server";

import { isStandaloneModifierProduct } from "@/lib/drink-customizations";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      available: true,
      prepSeconds: true,
      loyaltyEligible: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(
    {
      products: products
        .filter((p) => !isStandaloneModifierProduct(p))
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          priceCents: p.priceCents,
          available: p.available,
          prepSeconds: p.prepSeconds,
          loyaltyEligible: p.loyaltyEligible
        }))
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
      }
    }
  );
}
