import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/server/db";
import { verifyPassword } from "@/server/password";
import { decryptSecret } from "@/server/secret-box";
import { verifyTotp } from "@/server/totp";

type AppUserRole = "customer" | "staff" | "manager";

function normalizeRole(role: unknown): AppUserRole {
  if (role === "staff" || role === "manager") return role;
  return "customer";
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true
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
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const totp = String((credentials as any)?.totp ?? "").trim();
        if (!email || !password) return null;

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
        if (!user || user.disabledAt) return null;
        if (!user.passwordHash) return null;

        const ok = await verifyPassword({ password, stored: user.passwordHash });
        if (!ok) return null;

        const isManager = normalizeRole(user.role) === "manager";
        const mfaEnabled = Boolean(user.mfaTotpEnabledAt && user.mfaTotpSecret);
        if (isManager && mfaEnabled) {
          if (!totp) throw new Error("TOTPRequired");
          try {
            const secretBase32 = decryptSecret(user.mfaTotpSecret!);
            const valid = verifyTotp({ secretBase32, token: totp });
            if (!valid) throw new Error("TOTPInvalid");
          } catch {
            throw new Error("TOTPInvalid");
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: normalizeRole(user.role)
        } as any;
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
                } as any;
              }

              const created = await prisma.user.create({
                data: { email, name: "Dev User", role: "manager" }
              });
              return {
                id: created.id,
                email: created.email,
                name: created.name,
                image: created.image,
                role: "manager" satisfies AppUserRole
              } as any;
            }
          })
        ]
      : [])
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = normalizeRole((user as any).role);
      }
      return session;
    }
  }
};
