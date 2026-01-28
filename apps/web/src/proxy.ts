import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getCanonicalOrigin() {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (!configured) return null;
  try {
    const u = new URL(configured);
    // Render runs the app on an internal port (commonly 10000). If a URL with :10000
    // accidentally gets configured, treat it as the canonical public origin.
    if (u.port === "10000") u.port = "";
    // Also normalize default ports.
    if (u.protocol === "https:" && u.port === "443") u.port = "";
    if (u.protocol === "http:" && u.port === "80") u.port = "";
    return u.origin;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const canonicalOrigin = getCanonicalOrigin();
  if (!canonicalOrigin) return NextResponse.next();

  const canonical = new URL(canonicalOrigin);
  const current = request.nextUrl;

  // Only redirect browser navigations. Avoid breaking POSTs (e.g. auth callbacks, webhooks).
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  const sameHost = current.host === canonical.host;
  const sameProto = current.protocol === canonical.protocol;
  if (sameHost && sameProto) return NextResponse.next();

  const url = new URL(request.url);
  url.protocol = canonical.protocol;
  url.host = canonical.host;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    // Skip Next internals/static files.
    "/((?!_next|icon\\.svg|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)).*)"
  ]
};
