import crypto from "node:crypto";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { prisma } from "@/server/db";
import { authOptions } from "@/server/auth/config";
import { requireRole } from "@/server/auth/access";
import { getStripeRuntimeConfig } from "@/server/payments/stripe";
import { getConfiguredPublicOrigin, getConfiguredPublicUrl, getConfiguredVapidSubject } from "@/lib/public-url";
import { extractUser } from "@/types/auth";

export const dynamic = "force-dynamic";

function parseCookieHeader(header: string | null) {
  const out = new Map<string, string>();
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out.set(k, v);
  }
  return out;
}

function timingSafeEquals(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function readHealthcheckToken(request: Request) {
  const explicit = request.headers.get("x-healthcheck-token")?.trim();
  if (explicit) return explicit;

  const auth = request.headers.get("authorization")?.trim();
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice("bearer ".length).trim() || null;
}

async function getDiagnosticsAccessMode(request: Request) {
  if (process.env.NODE_ENV !== "production") return "development" as const;

  const configuredToken = process.env.HEALTHCHECK_TOKEN?.trim();
  const suppliedToken = readHealthcheckToken(request);
  if (configuredToken && suppliedToken && timingSafeEquals(configuredToken, suppliedToken)) {
    return "token" as const;
  }

  const access = await requireRole(["manager"]);
  if (access.ok) return "manager_session" as const;
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wantsVerbose = searchParams.get("verbose") === "1";

  if (!wantsVerbose) {
    return NextResponse.json(
      { ok: true, ts: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const accessMode = await getDiagnosticsAccessMode(request);
  if (!accessMode) {
    return NextResponse.json(
      { error: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const configured = process.env.NEXTAUTH_URL?.trim() || null;
  const {
    secretKey: stripeSecret,
    webhookSecret: stripeWebhookSecret,
    webhookIpAllowlist,
    enabled: stripeEnabled,
    mode: stripeMode
  } =
    getStripeRuntimeConfig();
  const canonicalUrl = getConfiguredPublicUrl();
  const canonicalOrigin = getConfiguredPublicOrigin();
  const vapidSubject = getConfiguredVapidSubject();
  const vapidIsMailto = vapidSubject.startsWith("mailto:");
  const vapidMatchesCanonical = vapidIsMailto || (canonicalOrigin ? vapidSubject === canonicalOrigin : false);

  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookieHeader(cookieHeader);
  const sessionCookieName =
    cookies.has("__Secure-next-auth.session-token")
      ? "__Secure-next-auth.session-token"
      : cookies.has("next-auth.session-token")
        ? "next-auth.session-token"
        : null;
  const csrfCookiePresent = cookies.has("__Host-next-auth.csrf-token") || cookies.has("next-auth.csrf-token");
  const sessionCookiePresent = Boolean(sessionCookieName);

  let db: { ok: true } | { ok: false; error: string } = { ok: true };
  try {
    await prisma.user.count({ take: 1 });
  } catch (err: any) {
    db = { ok: false, error: String(err?.code || err?.name || "db_error") };
  }

  let dbSchema: Record<string, { ok: boolean; error?: string }> = {
    User: { ok: true },
    Session: { ok: true },
    Account: { ok: true }
  };
  try {
    await prisma.user.count({ take: 1 });
  } catch (err: any) {
    dbSchema.User = { ok: false, error: String(err?.code || err?.name || "User_error") };
  }
  try {
    await prisma.session.count({ take: 1 });
  } catch (err: any) {
    dbSchema.Session = { ok: false, error: String(err?.code || err?.name || "Session_error") };
  }
  try {
    await prisma.account.count({ take: 1 });
  } catch (err: any) {
    dbSchema.Account = { ok: false, error: String(err?.code || err?.name || "Account_error") };
  }

  let sessionTokenRecord: { cookiePresent: boolean; inDb: boolean; expiresIso: string | null } = {
    cookiePresent: sessionCookiePresent,
    inDb: false,
    expiresIso: null
  };
  if (sessionCookieName) {
    const token = cookies.get(sessionCookieName) ?? "";
    if (token) {
      try {
        const s = await prisma.session.findUnique({
          where: { sessionToken: token },
          select: { expires: true }
        });
        sessionTokenRecord = { cookiePresent: true, inDb: Boolean(s), expiresIso: s?.expires?.toISOString() ?? null };
      } catch {
        // ignore
      }
    }
  }

  let sessionInfo: { ok: true; signedIn: boolean; role?: string } | { ok: false; error: string };
  try {
    const session = await getServerSession(authOptions);
    const user = extractUser(session);
    sessionInfo = {
      ok: true,
      signedIn: Boolean(user?.id),
      role: user?.role ?? "customer"
    };
  } catch (err: any) {
    sessionInfo = { ok: false, error: String(err?.name || "session_error") };
  }

  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      diagnosticsAccess: accessMode,
      db,
      dbSchema,
      session: sessionInfo,
      cookies: {
        headerPresent: Boolean(cookieHeader),
        sessionCookiePresent,
        sessionCookieName,
        csrfCookiePresent,
        sessionTokenInDb: sessionTokenRecord.inDb,
        sessionTokenExpiresIso: sessionTokenRecord.expiresIso
      },
      env: {
        nextauthUrlConfigured: Boolean(configured),
        nextauthUrlValid: Boolean(canonicalUrl),
        nextauthUrlHttps: Boolean(canonicalUrl && canonicalUrl.protocol === "https:"),
        nextauthSecretConfigured: Boolean(process.env.NEXTAUTH_SECRET),
        nextauthDebugEnabled: process.env.NEXTAUTH_DEBUG === "true",
        canonicalOrigin,
        googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        stripeSecretConfigured: Boolean(stripeSecret),
        stripeWebhookConfigured: Boolean(stripeWebhookSecret),
        stripeWebhookIpAllowlistConfigured: webhookIpAllowlist.length > 0,
        stripeEnabled,
        stripeMode,
        vapidSubjectConfigured: Boolean(process.env.VAPID_SUBJECT?.trim()),
        vapidSubjectValid: Boolean(vapidSubject),
        vapidSubjectMatchesCanonical: vapidMatchesCanonical,
        mfaEncryptionKeyConfigured: Boolean(process.env.MFA_ENCRYPTION_KEY?.trim()),
        devAuthEnabled:
          process.env.DEV_AUTH_ENABLED === "true" || process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true",
        healthcheckTokenConfigured: Boolean(process.env.HEALTHCHECK_TOKEN?.trim())
      },
      request: {
        host: request.headers.get("host"),
        origin: request.headers.get("origin"),
        referer: request.headers.get("referer"),
        forwardedHost: request.headers.get("x-forwarded-host"),
        forwardedProto: request.headers.get("x-forwarded-proto")
      }
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
