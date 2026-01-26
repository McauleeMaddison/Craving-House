import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireRole(["manager"]);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  const user = await prisma.user.findUnique({
    where: { id: access.userId },
    select: { mfaTotpSecret: true, mfaTotpEnabledAt: true }
  });

  const enabled = Boolean(user?.mfaTotpEnabledAt && user?.mfaTotpSecret);
  const pending = Boolean(user?.mfaTotpSecret && !user?.mfaTotpEnabledAt);
  return NextResponse.json({ enabled, pending });
}

