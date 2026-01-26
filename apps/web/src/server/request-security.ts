function getConfiguredOrigin() {
  const base = process.env.NEXTAUTH_URL?.trim();
  if (!base) return null;
  try {
    return new URL(base).origin;
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

