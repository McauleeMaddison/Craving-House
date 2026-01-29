import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getForwardedProto(request: NextRequest) {
  const raw = request.headers.get("x-forwarded-proto");
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim().toLowerCase();
  if (first === "http" || first === "https") return `${first}:`;
  return null;
}

function getForwardedHost(request: NextRequest) {
  const raw = request.headers.get("x-forwarded-host");
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim().toLowerCase();
  return first || null;
}

function stripPort(host: string) {
  // IPv6 host: [::1]:3000
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end === -1) return host;
    return host.slice(0, end + 1);
  }
  return host.split(":")[0] ?? host;
}

function getCanonicalUrl() {
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
    return u;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const canonical = getCanonicalUrl();
  if (!canonical) return NextResponse.next();

  // Only redirect browser navigations. Avoid breaking POSTs (e.g. auth callbacks, webhooks).
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  const forwardedProto = getForwardedProto(request);
  const effectiveProto = forwardedProto ?? request.nextUrl.protocol;

  const forwardedHost = getForwardedHost(request);
  const effectiveHost = forwardedHost ?? request.headers.get("host") ?? request.nextUrl.host;
  const effectiveHostname = stripPort(effectiveHost);

  let effectiveCanonicalProto = canonical.protocol;
  // Never downgrade to http when the public request is clearly https.
  if (effectiveCanonicalProto === "http:" && effectiveProto === "https:") {
    effectiveCanonicalProto = "https:";
  }

  const sameHost = effectiveHostname === canonical.hostname;
  const sameProto = effectiveProto === effectiveCanonicalProto;
  if (sameHost && sameProto) return NextResponse.next();

  const dest = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonical.origin);
  dest.protocol = effectiveCanonicalProto;
  return NextResponse.redirect(dest, 308);
}

export const config = {
  matcher: [
    // Skip Next internals/static files.
    "/((?!_next|icon\\.svg|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)).*)"
  ]
};
