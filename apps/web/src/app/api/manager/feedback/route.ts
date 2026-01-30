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

  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: true }
  });

  return NextResponse.json({
    feedback: feedback.map((f) => ({
      id: f.id,
      createdAtIso: f.createdAt.toISOString(),
      rating: f.rating,
      message: f.message,
      user: f.user ? { id: f.user.id, email: f.user.email ?? null, name: f.user.name ?? null } : null
    }))
  });
}

