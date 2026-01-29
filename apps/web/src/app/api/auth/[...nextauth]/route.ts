import NextAuth from "next-auth";

import { authOptions } from "@/server/auth";

export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

function withNoStore(res: Response) {
  // Avoid any intermediary caching of auth responses (session can look like `{}` if cached).
  res.headers.set("cache-control", "no-store");
  return res;
}

export async function GET(request: Request) {
  return withNoStore(await handler(request));
}

export async function POST(request: Request) {
  return withNoStore(await handler(request));
}
