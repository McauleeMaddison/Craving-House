import { clearRateLimit, getRateLimitBlockStatus, rateLimit } from "@/server/security/rate-limit";

const SIGN_IN_WINDOW_MS = 10 * 60_000;
const SIGN_IN_LOCK_MS = 15 * 60_000;
const SIGN_IN_EMAIL_LIMIT = 5;
const SIGN_IN_EMAIL_IP_LIMIT = 5;
const SIGN_IN_IP_LIMIT = 20;
const SIGN_IN_REQUEST_LIMIT = 30;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeIp(ip: string) {
  const trimmed = ip.trim();
  return trimmed.length > 0 ? trimmed : "unknown";
}

function buildCredentialKeys(email: string, ip: string) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = normalizeIp(ip);

  return {
    requestIp: `auth:signin:request-ip:${normalizedIp}`,
    ip: `auth:signin:ip:${normalizedIp}`,
    email: normalizedEmail ? `auth:signin:email:${normalizedEmail}` : null,
    emailIp: normalizedEmail ? `auth:signin:email-ip:${normalizedEmail}:${normalizedIp}` : null
  };
}

function pickLongestRetry(seconds: number[]) {
  return seconds.reduce((max, value) => Math.max(max, value), 0);
}

export function formatTooManyAttemptsError(retryAfterSeconds: number) {
  return `TooManyAttempts:${Math.max(1, Math.ceil(retryAfterSeconds))}`;
}

export function parseTooManyAttemptsError(error: string) {
  if (!error.startsWith("TooManyAttempts")) return null;
  const retryAfterSeconds = Number(error.split(":")[1] ?? "");
  return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? Math.ceil(retryAfterSeconds) : null;
}

export async function rateLimitCredentialSignInRequest(params: { ip: string }) {
  return rateLimit({
    key: buildCredentialKeys("", params.ip).requestIp,
    limit: SIGN_IN_REQUEST_LIMIT,
    windowMs: SIGN_IN_WINDOW_MS
  });
}

export async function getCredentialSignInBlockStatus(params: { email: string; ip: string }) {
  const keys = buildCredentialKeys(params.email, params.ip);
  const statuses = await Promise.all(
    [keys.ip, keys.email, keys.emailIp].filter(Boolean).map((key) => getRateLimitBlockStatus(key!))
  );

  const blockedStatuses = statuses.filter((status) => status.blocked && status.blockedUntilMs);
  if (blockedStatuses.length === 0) {
    return { blocked: false as const, retryAfterSeconds: 0 };
  }

  const latestBlockedUntilMs = blockedStatuses.reduce(
    (max, status) => Math.max(max, status.blockedUntilMs ?? 0),
    0
  );

  return {
    blocked: true as const,
    retryAfterSeconds: Math.max(1, Math.ceil((latestBlockedUntilMs - Date.now()) / 1000))
  };
}

export async function registerCredentialSignInFailure(params: { email: string; ip: string }) {
  const keys = buildCredentialKeys(params.email, params.ip);
  const results = await Promise.all([
    rateLimit({ key: keys.ip, limit: SIGN_IN_IP_LIMIT, windowMs: SIGN_IN_WINDOW_MS, blockMs: SIGN_IN_LOCK_MS }),
    ...(keys.email
      ? [
          rateLimit({
            key: keys.email,
            limit: SIGN_IN_EMAIL_LIMIT,
            windowMs: SIGN_IN_WINDOW_MS,
            blockMs: SIGN_IN_LOCK_MS
          })
        ]
      : []),
    ...(keys.emailIp
      ? [
          rateLimit({
            key: keys.emailIp,
            limit: SIGN_IN_EMAIL_IP_LIMIT,
            windowMs: SIGN_IN_WINDOW_MS,
            blockMs: SIGN_IN_LOCK_MS
          })
        ]
      : [])
  ]);

  const rejected = results.filter((result) => !result.ok);
  if (rejected.length === 0) return { blocked: false as const, retryAfterSeconds: 0 };

  return {
    blocked: true as const,
    retryAfterSeconds: pickLongestRetry(rejected.map((result) => result.retryAfterSeconds))
  };
}

export async function clearCredentialSignInFailures(params: { email: string; ip: string }) {
  const keys = buildCredentialKeys(params.email, params.ip);
  await Promise.all([keys.email, keys.emailIp].filter(Boolean).map((key) => clearRateLimit(key!)));
}
