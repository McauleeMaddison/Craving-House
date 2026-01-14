import type { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/server/db";

type AppUserRole = "customer" | "staff" | "manager";

function normalizeRole(role: unknown): AppUserRole {
  if (role === "staff" || role === "manager") return role;
  return "customer";
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID ?? "",
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? ""
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
