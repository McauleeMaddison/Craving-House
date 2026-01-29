import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { proxy } from "@/proxy";

export const config = {
  matcher: [
    // Skip Next internals/static files.
    "/((?!_next|icon\\.svg|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)).*)"
  ]
};

export default function middleware(request: NextRequest) {
  // Avoid redirecting local/dev traffic to the configured production origin.
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  return proxy(request);
}
