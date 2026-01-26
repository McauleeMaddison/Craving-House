import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/access";
import { hashPassword, validatePasswordForSignup } from "@/server/password";
import { isSameOrigin } from "@/server/request-security";

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

type CreateBody = {
  email: string;
  name?: string;
  role?: "customer" | "staff" | "manager";
  password: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isReasonableEmail(email: string) {
  if (email.length < 3 || email.length > 254) return false;
  if (!email.includes("@")) return false;
  return true;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthorized" ? 401 : 403 }
    );
  }

  const body = (await request.json()) as Partial<CreateBody>;
  const email = normalizeEmail(String(body.email ?? ""));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const role = body.role === "manager" || body.role === "staff" ? body.role : "customer";
  const password = String(body.password ?? "");

  if (!isReasonableEmail(email)) return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  const passwordError = validatePasswordForSignup(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const passwordHash = await hashPassword(password);

  const created = await prisma.user.create({
    data: {
      email,
      name: name || null,
      role,
      passwordHash,
      loyaltyAccount: { create: {} }
    },
    select: { id: true }
  });

  return NextResponse.json({ id: created.id });
}
