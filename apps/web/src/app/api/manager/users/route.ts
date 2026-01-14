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
  const q = (searchParams.get("q") ?? "").trim();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      disabledAt: true,
      createdAt: true
    }
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      disabledAtIso: u.disabledAt?.toISOString() ?? null,
      createdAtIso: u.createdAt.toISOString()
    }))
  });
}

