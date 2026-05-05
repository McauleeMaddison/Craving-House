import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/server/db";
import { clearCredentialSignInFailures, formatTooManyAttemptsError, getCredentialSignInBlockStatus, registerCredentialSignInFailure } from "@/server/auth/rate-limit";
import { getClientIp } from "@/server/security/rate-limit";
import { hashPassword, passwordHashNeedsRehash, verifyPassword } from "@/server/auth/password";
import { decryptSecret } from "@/server/auth/secret-box";
import { verifyTotp } from "@/server/auth/totp";
import { normalizeRole, parseCredentials, parseOAuthProfile, type AppRole } from "@/types/auth";

const forceSecureSessionCookieInProduction =
  process.env.FORCE_SECURE_SESSION_COOKIE_IN_PRODUCTION !== "false";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  // Credentials auth is designed around JWT sessions.
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  // Always use secure cookies in production (required for iOS/Safari to persist sessions on HTTPS).
  useSecureCookies: process.env.NODE_ENV === "production",
  // On some proxy setups, `__Secure-*` prefixed cookies can fail to persist if the Secure attribute
  // isn't applied as expected. Explicitly define the session cookie for production to avoid this.
  ...(process.env.NODE_ENV === "production" && forceSecureSessionCookieInProduction
    ? {
        cookies: {
          sessionToken: {
            name: "next-auth.session-token",
            options: {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: true
            }
          }
        }
      }
    : {}),
  debug: process.env.NEXTAUTH_DEBUG === "true",
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            authorization: {
              params: {
                prompt: "select_account"
              }
            }
          })
        ]
      : []),
    CredentialsProvider({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authenticator code", type: "text" }
      },
      async authorize(credentials, req) {
        // Use type-safe credentials parser instead of `as any`
        const parsed = parseCredentials(credentials);
        if (!parsed) return null;
        
        const email = String(parsed.email ?? "").trim().toLowerCase();
        const password = String(parsed.password ?? "");
        const totp = String(parsed.totp ?? "").trim();
        const ip = getClientIp((req?.headers as any) ?? {});
        if (!email || !password) return null;

        const fail = async (errorCode?: string) => {
          const failed = await registerCredentialSignInFailure({ email, ip });
          if (failed.blocked) throw new Error(formatTooManyAttemptsError(failed.retryAfterSeconds));
          if (errorCode) throw new Error(errorCode);
          return null;
        };

        const blocked = await getCredentialSignInBlockStatus({ email, ip });
        if (blocked.blocked) {
          throw new Error(formatTooManyAttemptsError(blocked.retryAfterSeconds));
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            disabledAt: true,
            passwordHash: true,
            mfaTotpSecret: true,
            mfaTotpEnabledAt: true
          }
        });
        if (!user || user.disabledAt) return fail();
        if (!user.passwordHash) return fail();

        const ok = await verifyPassword({ password, stored: user.passwordHash });
        if (!ok) return fail();

        const isManager = normalizeRole(user.role) === "manager";
        const mfaEnabled = Boolean(user.mfaTotpEnabledAt && user.mfaTotpSecret);
        if (isManager && mfaEnabled) {
          if (!totp) return fail("TOTPRequired");
          try {
            const secretBase32 = decryptSecret(user.mfaTotpSecret!);
            const valid = verifyTotp({ secretBase32, token: totp });
            if (!valid) return fail("TOTPInvalid");
          } catch {
            return fail("TOTPInvalid");
          }
        }

        await clearCredentialSignInFailures({ email, ip });

        if (passwordHashNeedsRehash(user.passwordHash)) {
          void hashPassword(password)
            .then((passwordHash) =>
              prisma.user.update({
                where: { id: user.id },
                data: { passwordHash }
              })
            )
            .catch((error) => {
              console.error("Failed to rehash password after sign-in", error);
            });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: normalizeRole(user.role)
        };
      }
    }),
    ...(process.env.DEV_AUTH_ENABLED === "true"
      ? [
          CredentialsProvider({
            id: "dev",
            name: "Dev login",
            credentials: {
              code: { label: "Dev code", type: "password" }
            },
            async authorize(credentials, _req) {
              const code = credentials?.code?.trim();
              const expected = process.env.DEV_AUTH_CODE;
              if (!expected || expected.length < 8) return null;
              if (!code || code !== expected) return null;

              const email = "dev@local";
              const existing = await prisma.user.findFirst({ where: { email } });
              if (existing) {
                return {
                  id: existing.id,
                  email: existing.email,
                  name: existing.name,
                  image: existing.image,
                  role: normalizeRole(existing.role)
                };
              }

              const created = await prisma.user.create({
                data: { email, name: "Dev User", role: "manager" }
              });
              return {
                id: created.id,
                email: created.email,
                name: created.name,
                image: created.image,
                role: "manager" satisfies AppRole
              };
            }
          })
        ]
      : [])
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
      if (!email) return true;
      
      // Use type-safe OAuth profile parser
      const oauthProfile = parseOAuthProfile(profile);
      if (oauthProfile?.email_verified === false) {
        return "/signin?error=GoogleEmailNotVerified";
      }

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { role: true }
      });
      if (existing && normalizeRole(existing.role) === "manager") {
        return "/signin?error=ManagerEmailOnly";
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      const userId = typeof token.sub === "string" ? token.sub : "";
      if (!userId) {
        token.role = normalizeRole(token.role ?? "customer");
        return token;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, disabledAt: true }
        });

        if (!dbUser || dbUser.disabledAt) {
          token.role = "customer";
          return token;
        }

        token.role = normalizeRole(dbUser.role);
      } catch {
        // Fall back to whatever role data is already available on token/user.
        if (typeof token.role !== "string" || !token.role) {
          const userRole = typeof (user as any)?.role === "string" ? (user as any).role : "customer";
          token.role = normalizeRole(userRole);
        } else {
          token.role = normalizeRole(token.role);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
        session.user.role = normalizeRole(token.role ?? "customer");
      }
      return session;
    }
  }
};
