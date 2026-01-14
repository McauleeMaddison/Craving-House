import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";

export const dynamic = "force-dynamic";

type PatchBody = Partial<{
  role: "customer" | "staff" | "manager";
  disabled: boolean;
  note: string;
}>;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
    );
  }

  const { id: targetUserId } = await context.params;
  const body = (await request.json()) as PatchBody;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, disabledAt: true }
  });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updates: Record<string, unknown> = {};

  if (body.role) {
    const toRole = body.role;
    const fromRole = target.role;
    if (toRole !== fromRole) {
      updates.role = toRole;
      await prisma.roleChange.create({
        data: {
          byUserId: access.userId,
          targetUserId,
          fromRole,
          toRole,
          note: body.note?.trim() || null
        }
      });
    }
  }

  if (typeof body.disabled === "boolean") {
    updates.disabledAt = body.disabled ? new Date() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: updates
  });

  return NextResponse.json({ ok: true });
}

