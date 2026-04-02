import crypto from "node:crypto";

import { prisma } from "@/server/db";

export type RateLimitResult =
  | { ok: true; remaining: number; resetAtMs: number }
  | { ok: false; retryAfterSeconds: number; resetAtMs: number; blockedUntilMs?: number };

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  blockMs?: number;
};

type RateLimitRow = {
  count: number | bigint;
  resetAt: Date;
  blockedUntil: Date | null;
};

const CLEANUP_INTERVAL_MS = 5 * 60_000;
const CLEANUP_GRACE_MS = 24 * 60 * 60_000;

let lastCleanupAttemptMs = 0;

function nowMs() {
  return Date.now();
}

function hashRateLimitKey(key: string) {
  return crypto.createHash("sha256").update(key, "utf8").digest("hex");
}

function normalizeCount(value: number | bigint) {
  return typeof value === "bigint" ? Number(value) : value;
}

async function maybeCleanupExpiredBuckets(now: Date) {
  const startedAt = now.getTime();
  if (startedAt - lastCleanupAttemptMs < CLEANUP_INTERVAL_MS) return;
  lastCleanupAttemptMs = startedAt;

  void prisma.rateLimitBucket
    .deleteMany({
      where: {
        resetAt: {
          lt: new Date(startedAt - CLEANUP_GRACE_MS)
        },
        OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }]
      }
    })
    .catch(() => {
      // Ignore cleanup failures. Rate limiting should keep working even if cleanup is skipped.
    });
}

export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  await maybeCleanupExpiredBuckets(now);

  const resetAt = new Date(now.getTime() + options.windowMs);
  const bucketId = hashRateLimitKey(options.key);
  const blockMs = options.blockMs ?? null;

  const rows = await prisma.$queryRaw<RateLimitRow[]>`
    INSERT INTO "RateLimitBucket" ("id", "count", "resetAt", "blockedUntil", "createdAt", "updatedAt")
    VALUES (${bucketId}, 1, ${resetAt}, NULL, NOW(), NOW())
    ON CONFLICT ("id") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."blockedUntil" IS NOT NULL AND "RateLimitBucket"."blockedUntil" > NOW() THEN "RateLimitBucket"."count"
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt", "blockedUntil"
  `;

  const row = rows[0];
  if (!row) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(options.windowMs / 1000)), resetAtMs: resetAt.getTime() };
  }

  const count = normalizeCount(row.count);
  const activeBlockedUntilMs = row.blockedUntil?.getTime() ?? null;
  if (activeBlockedUntilMs && activeBlockedUntilMs > now.getTime()) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((activeBlockedUntilMs - now.getTime()) / 1000)),
      resetAtMs: row.resetAt.getTime(),
      blockedUntilMs: activeBlockedUntilMs
    };
  }

  if (count > options.limit) {
    const nextBlockedUntil = blockMs ? new Date(now.getTime() + blockMs) : null;
    if (nextBlockedUntil) {
      await prisma.rateLimitBucket.update({
        where: { id: bucketId },
        data: {
          blockedUntil: nextBlockedUntil,
          updatedAt: now
        }
      });
    }

    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(((nextBlockedUntil?.getTime() ?? row.resetAt.getTime()) - now.getTime()) / 1000)
      ),
      resetAtMs: row.resetAt.getTime(),
      blockedUntilMs: nextBlockedUntil?.getTime()
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, options.limit - count),
    resetAtMs: row.resetAt.getTime()
  };
}

type HeaderSource =
  | Request
  | Headers
  | Record<string, string | string[] | undefined | null>
  | null
  | undefined;

function readHeader(source: HeaderSource, name: string) {
  if (!source) return null;
  if (source instanceof Request) return source.headers.get(name);
  if (source instanceof Headers) return source.get(name);

  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(source)) {
    if (key.toLowerCase() !== lower) continue;
    if (Array.isArray(value)) return value[0] ?? null;
    return typeof value === "string" ? value : null;
  }
  return null;
}

export function getClientIp(source: HeaderSource) {
  const candidates = [
    readHeader(source, "cf-connecting-ip"),
    readHeader(source, "x-real-ip"),
    readHeader(source, "x-vercel-forwarded-for"),
    readHeader(source, "fly-client-ip"),
    readHeader(source, "x-forwarded-for")
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const first = candidate.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}

export async function getRateLimitBlockStatus(key: string) {
  const bucket = await prisma.rateLimitBucket.findUnique({
    where: { id: hashRateLimitKey(key) },
    select: { blockedUntil: true }
  });

  const blockedUntilMs = bucket?.blockedUntil?.getTime() ?? null;
  return {
    blocked: Boolean(blockedUntilMs && blockedUntilMs > nowMs()),
    blockedUntilMs
  };
}

export async function clearRateLimit(key: string) {
  await prisma.rateLimitBucket.deleteMany({
    where: { id: hashRateLimitKey(key) }
  });
}
