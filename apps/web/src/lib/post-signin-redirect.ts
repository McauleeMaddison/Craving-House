type ResolvePostSignInRedirectInput = {
  role: unknown;
  resultUrl?: string | null;
  callbackUrl?: string | null;
};

function normalizePortalRole(role: unknown) {
  if (role === "manager" || role === "staff") return role;
  return "customer";
}

export function resolvePostSignInRedirect(input: ResolvePostSignInRedirectInput) {
  const role = normalizePortalRole(input.role);
  if (role === "manager") return "/manager";
  if (role === "staff") return "/staff";

  const resultUrl = typeof input.resultUrl === "string" ? input.resultUrl.trim() : "";
  if (resultUrl) return resultUrl;

  const callbackUrl = typeof input.callbackUrl === "string" ? input.callbackUrl.trim() : "";
  if (callbackUrl.startsWith("/")) return callbackUrl;

  return "/";
}
