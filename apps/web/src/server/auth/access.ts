import { getServerSession } from "next-auth/next";

import { authOptions } from "@/server/auth/config";
import { prisma } from "@/server/db";

export type AppRole = "customer" | "staff" | "manager";
type AccessReason = "unauthorized" | "forbidden" | "mfa_required";
type RequireRoleOptions = { requireManagerMfa?: boolean };

function isManagerMfaEnabled(user: {
  mfaTotpSecret: string | null;
  mfaTotpEnabledAt: Date | null;
}) {
  return Boolean(user.mfaTotpSecret && user.mfaTotpEnabledAt);
}

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

export async function requireRole(allowed: AppRole[], options: RequireRoleOptions = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false as const, reason: "unauthorized" as AccessReason };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      disabledAt: true,
      mfaTotpSecret: true,
      mfaTotpEnabledAt: true
    }
  });
  if (!user) return { ok: false as const, reason: "unauthorized" as AccessReason };
  if (user.disabledAt) return { ok: false as const, reason: "unauthorized" as AccessReason };

  const role = (user.role as AppRole) || "customer";
  if (!allowed.includes(role)) return { ok: false as const, reason: "forbidden" as AccessReason };

  const mfaEnabled = role === "manager" ? isManagerMfaEnabled(user) : false;
  const requireManagerMfa = options.requireManagerMfa ?? allowed.includes("manager");
  if (role === "manager" && requireManagerMfa && !mfaEnabled) {
    return { ok: false as const, reason: "mfa_required" as AccessReason };
  }

  return { ok: true as const, userId: user.id, role, mfaEnabled };
}
