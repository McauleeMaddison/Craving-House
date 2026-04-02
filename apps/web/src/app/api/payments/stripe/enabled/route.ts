import { NextResponse } from "next/server";

import { getStripeRuntimeConfig } from "@/server/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const { enabled } = getStripeRuntimeConfig();
  return NextResponse.json({ enabled });
}
