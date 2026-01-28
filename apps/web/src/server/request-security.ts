function getConfiguredOrigin() {
  const base = process.env.NEXTAUTH_URL?.trim();
  if (!base) return null;
  try {
    const u = new URL(base);
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

function getRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const ref = request.headers.get("referer");
  if (!ref) return null;
  try {
    return new URL(ref).origin;
  } catch {
    return null;
  }
}

export function isSameOrigin(request: Request) {
  const configured = getConfiguredOrigin();
  if (!configured) return true; // no baseline, don't block

  const reqOrigin = getRequestOrigin(request);
  if (!reqOrigin) return true; // allow non-browser / missing origin

  return reqOrigin === configured;
}
