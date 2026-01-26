type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const store = new Map<string, { count: number; resetAtMs: number }>();

function nowMs() {
  return Date.now();
}

function cleanup(now: number) {
  for (const [k, v] of store.entries()) {
    if (v.resetAtMs <= now) store.delete(k);
  }
}

export function rateLimit(options: RateLimitOptions): RateLimitResult {
  const now = nowMs();
  cleanup(now);

  const existing = store.get(options.key);
  if (!existing || existing.resetAtMs <= now) {
    store.set(options.key, { count: 1, resetAtMs: now + options.windowMs });
    return { ok: true };
  }

  if (existing.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }

  existing.count += 1;
  store.set(options.key, existing);
  return { ok: true };
}

export function getClientIp(request: Request) {
  const xfwd = request.headers.get("x-forwarded-for");
  if (xfwd) return xfwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
