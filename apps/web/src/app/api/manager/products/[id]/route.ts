import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";

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
  const access = await requireRole(["manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

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
