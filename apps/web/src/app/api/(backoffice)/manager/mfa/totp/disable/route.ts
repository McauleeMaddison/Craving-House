import { NextResponse } from "next/server";

import { requireRole } from "@/server/auth/access";
import { isSameOrigin } from "@/server/security/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const access = await requireRole(["manager"], { requireManagerMfa: false });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthorized" ? 401 : 403 });

  return NextResponse.json({ error: "mfa_required" }, { status: 409 });
}
