import { NextResponse } from "next/server";

import { getStripeRuntimeConfig } from "@/server/payments/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const { enabled } = getStripeRuntimeConfig();
  return NextResponse.json({ enabled });
}
