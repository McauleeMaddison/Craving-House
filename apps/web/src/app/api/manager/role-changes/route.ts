import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.round(limitRaw))) : 100;

  const changes = await prisma.roleChange.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { byUser: true, targetUser: true }
  });

  return NextResponse.json({
    changes: changes.map((c) => ({
      id: c.id,
      createdAtIso: c.createdAt.toISOString(),
      fromRole: c.fromRole,
      toRole: c.toRole,
      note: c.note ?? null,
      by: { id: c.byUserId, email: c.byUser.email ?? null, name: c.byUser.name ?? null },
      target: { id: c.targetUserId, email: c.targetUser.email ?? null, name: c.targetUser.name ?? null }
    }))
  });
}

