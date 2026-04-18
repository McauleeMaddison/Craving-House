import { getConfiguredPublicOrigin } from "../../lib/public-url.ts";

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

function getFetchSite(request: Request) {
  return request.headers.get("sec-fetch-site")?.trim().toLowerCase() ?? null;
}

function isLoopbackOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  } catch {
    return false;
  }
}

export function isSameOrigin(request: Request) {
  const reqOrigin = getRequestOrigin(request);
  if (!reqOrigin) {
    const fetchSite = getFetchSite(request);
    if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return false;
    return true; // allow non-browser / missing origin
  }

  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = getConfiguredPublicOrigin();
  if (reqOrigin === requestOrigin || reqOrigin === configuredOrigin) return true;

  if (process.env.NODE_ENV !== "production" && isLoopbackOrigin(reqOrigin) && isLoopbackOrigin(requestOrigin)) {
    return true;
  }

  return false;
}
