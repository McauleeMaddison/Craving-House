import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/access";
import { hashPassword, validatePasswordForSignup } from "@/server/auth/password";
import { isSameOrigin } from "@/server/security/request-security";
import { getClientIp, rateLimit } from "@/server/security/rate-limit";
import { recordAuditEvent } from "@/server/monitoring/events";

export const dynamic = "force-dynamic";

type PatchBody = Partial<{
  role: "customer" | "staff" | "manager";
  disabled: boolean;
  terminate: boolean;
  note: string;
  newPassword: string;
}>;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
    );
  }

  const ip = getClientIp(request);
  const limited = await rateLimit({
    key: `manager:users:update:${access.userId}:${ip}`,
    limit: 30,
    windowMs: 60_000
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many user changes. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const { id: targetUserId } = await context.params;
  const body = (await request.json()) as PatchBody;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, disabledAt: true }
  });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const terminateRequested = body.terminate === true;
  if (terminateRequested) {
    if (target.role !== "customer") {
      return NextResponse.json({ error: "Only customer accounts can be terminated." }, { status: 400 });
    }
    if (typeof body.role === "string" && body.role !== "customer") {
      return NextResponse.json({ error: "Cannot change role when terminating a customer account." }, { status: 400 });
    }
    if (body.disabled === false) {
      return NextResponse.json({ error: "Termination requires disabling the account." }, { status: 400 });
    }
  }

  const canMutateManagerRoleOrAccess =
    target.role === "manager" &&
    ((typeof body.role === "string" && body.role !== "manager") || body.disabled === true);
  if (canMutateManagerRoleOrAccess) {
    const managerCount = await prisma.user.count({ where: { role: "manager", disabledAt: null } });
    if (managerCount <= 1) {
      return NextResponse.json({ error: "Cannot remove or disable the last active manager." }, { status: 409 });
    }
  }

  const updates: Record<string, unknown> = {};
  const auditChanges: Record<string, unknown> = {};
  let roleChangeToCreate:
    | {
        byUserId: string;
        targetUserId: string;
        fromRole: string;
        toRole: "customer" | "staff" | "manager";
        note: string | null;
      }
    | null = null;

  if (body.role && !terminateRequested) {
    const toRole = body.role;
    const fromRole = target.role;
    if (toRole !== fromRole) {
      updates.role = toRole;
      auditChanges.role = { from: fromRole, to: toRole };
      roleChangeToCreate = {
        byUserId: access.userId,
        targetUserId,
        fromRole,
        toRole,
        note: body.note?.trim() || null
      };
    }
  }

  if (terminateRequested) {
    updates.disabledAt = new Date();
    updates.passwordHash = null;
    updates.mfaTotpSecret = null;
    updates.mfaTotpEnabledAt = null;
    auditChanges.terminated = true;
    auditChanges.disabled = true;
  } else if (typeof body.disabled === "boolean") {
    updates.disabledAt = body.disabled ? new Date() : null;
    auditChanges.disabled = body.disabled;
  }

  if (typeof body.newPassword === "string" && body.newPassword.trim().length > 0) {
    if (terminateRequested) {
      return NextResponse.json({ error: "Cannot set password while terminating an account." }, { status: 400 });
    }
    const err = validatePasswordForSignup(body.newPassword);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    updates.passwordHash = await hashPassword(body.newPassword);
    auditChanges.passwordReset = true;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  let revokedSessions = 0;
  let revokedOAuthAccounts = 0;
  let revokedPushSubscriptions = 0;
  let loyaltyTokensRevoked = 0;

  await prisma.$transaction(async (tx) => {
    if (roleChangeToCreate) {
      await tx.roleChange.create({ data: roleChangeToCreate });
    }

    await tx.user.update({
      where: { id: targetUserId },
      data: updates
    });

    if (terminateRequested || body.disabled === true) {
      const [sessionsResult, accountsResult, pushResult] = await Promise.all([
        tx.session.deleteMany({ where: { userId: targetUserId } }),
        tx.account.deleteMany({ where: { userId: targetUserId } }),
        tx.pushSubscription.deleteMany({ where: { userId: targetUserId } })
      ]);
      revokedSessions = sessionsResult.count;
      revokedOAuthAccounts = accountsResult.count;
      revokedPushSubscriptions = pushResult.count;
    }

    if (terminateRequested) {
      const loyaltyResult = await tx.loyaltyAccount.updateMany({
        where: { userId: targetUserId, cardToken: { not: null } },
        data: { cardToken: null }
      });
      loyaltyTokensRevoked = loyaltyResult.count;
    }
  });

  if (terminateRequested || body.disabled === true) {
    auditChanges.revokedAccess = {
      sessions: revokedSessions,
      oauthAccounts: revokedOAuthAccounts,
      pushSubscriptions: revokedPushSubscriptions
    };
  }
  if (terminateRequested) {
    auditChanges.loyaltyTokensRevoked = loyaltyTokensRevoked;
  }

  void recordAuditEvent({
    area: "manager.users",
    action: terminateRequested ? "terminate" : "update",
    userId: access.userId,
    message: terminateRequested ? "Manager terminated customer account" : "Manager updated user account",
    details: {
      targetUserId,
      changes: auditChanges,
      note: body.note?.trim() || null
    }
  });

  return NextResponse.json({ ok: true });
}
