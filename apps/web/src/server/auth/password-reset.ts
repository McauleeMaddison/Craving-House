import crypto from "node:crypto";

import { getConfiguredPublicOrigin } from "../../lib/public-url.ts";

const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 30;

type PasswordResetTtlEnv = Partial<Pick<NodeJS.ProcessEnv, "PASSWORD_RESET_TOKEN_TTL_MINUTES">>;

export function normalizePasswordResetEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isReasonablePasswordResetEmail(email: string) {
  if (email.length < 3 || email.length > 254) return false;
  if (!email.includes("@")) return false;
  return true;
}

export function getPasswordResetIdentifier(email: string) {
  return `password-reset:${normalizePasswordResetEmail(email)}`;
}

export function createPasswordResetToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function getPasswordResetTtlMinutes(env?: PasswordResetTtlEnv) {
  const raw = (env ?? process.env).PASSWORD_RESET_TOKEN_TTL_MINUTES?.trim() ?? "";
  if (!raw) return DEFAULT_PASSWORD_RESET_TTL_MINUTES;

  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_PASSWORD_RESET_TTL_MINUTES;
  return Math.min(24 * 60, Math.max(5, Math.round(value)));
}

export function getPasswordResetExpiry(now = new Date(), ttlMinutes = getPasswordResetTtlMinutes()) {
  return new Date(now.getTime() + ttlMinutes * 60_000);
}

export function buildPasswordResetUrl(params: {
  email: string;
  token: string;
  requestOrigin?: string | null;
}) {
  const baseOrigin = params.requestOrigin?.trim() || getConfiguredPublicOrigin() || "http://localhost:3000";
  const url = new URL("/reset-password", baseOrigin);
  url.searchParams.set("email", params.email);
  url.searchParams.set("token", params.token);
  return url.toString();
}
