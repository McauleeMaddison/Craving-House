import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { shouldRedirectManagerToPortal } from "@/lib/manager-route-guard";
import { getConfiguredPublicUrl } from "@/lib/public-url";

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

async function getSessionToken(request: NextRequest) {
  const cookieName = request.cookies.has("next-auth.session-token")
    ? "next-auth.session-token"
    : request.cookies.has("__Secure-next-auth.session-token")
      ? "__Secure-next-auth.session-token"
      : undefined;

  return getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    ...(cookieName ? { cookieName } : {})
  });
}

export async function proxy(request: NextRequest) {
  const canonical = getConfiguredPublicUrl();

  // Only redirect browser navigations. Avoid breaking POSTs (e.g. auth callbacks, webhooks).
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  if (process.env.NODE_ENV === "production" && canonical) {
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
    if (!sameHost || !sameProto) {
      const dest = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonical.origin);
      dest.protocol = effectiveCanonicalProto;
      return NextResponse.redirect(dest, 308);
    }
  }

  const token = await getSessionToken(request);
  if ((token as { role?: string } | null)?.role === "manager") {
    const pathname = request.nextUrl.pathname;
    if (shouldRedirectManagerToPortal(pathname)) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/manager";
      dest.search = "";
      return NextResponse.redirect(dest);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals/static files.
    "/((?!_next|icon\\.svg|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)).*)"
  ]
};
