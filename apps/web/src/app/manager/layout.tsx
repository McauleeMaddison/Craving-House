import { connection } from "next/server";
import type { ReactNode } from "react";

export default async function ManagerLayout({ children }: { children: ReactNode }) {
  await connection();
  return children;
}
