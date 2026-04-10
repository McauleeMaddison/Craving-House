import type { NextRequest } from "next/server";

import { proxy } from "@/proxy";

export const config = {
  matcher: [
    // Skip Next internals/static files.
    "/((?!_next|icon\\.svg|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)).*)"
  ]
};

export default async function middleware(request: NextRequest) {
  return proxy(request);
}
