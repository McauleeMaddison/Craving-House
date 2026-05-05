function hasPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function shouldRedirectManagerToPortal(pathname: string) {
  if (hasPathPrefix(pathname, "/manager")) return false;
  if (hasPathPrefix(pathname, "/staff")) return false;
  if (hasPathPrefix(pathname, "/api")) return false;
  return true;
}
