import { getServerSession } from "next-auth/next";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export type AppRole = "customer" | "staff" | "manager";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false as const };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, disabledAt: true }
  });
  if (!user || user.disabledAt) return { ok: false as const };

  const role = (user.role as AppRole) || "customer";
  return { ok: true as const, userId: user.id, role };
}

export async function requireRole(allowed: AppRole[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false as const, reason: "unauthorized" as const };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, disabledAt: true }
  });
  if (!user) return { ok: false as const, reason: "unauthorized" as const };
  if (user.disabledAt) return { ok: false as const, reason: "unauthorized" as const };

  const role = (user.role as AppRole) || "customer";
  if (!allowed.includes(role)) return { ok: false as const, reason: "forbidden" as const };
  return { ok: true as const, userId: user.id, role };
}
