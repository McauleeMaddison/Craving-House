import Link from "next/link";
import { getServerSession } from "next-auth/next";

import { prisma } from "@/server/db";
import { authOptions } from "@/server/auth";
import { SetupClient } from "@/app/setup/SetupClient";

export default async function SetupPage() {
  const session = await getServerSession(authOptions);
  const managerCount = await prisma.user.count({ where: { role: "manager" } });

  return (
    <main>
      <h1>Initial setup</h1>
      <p>
        This is a one-time safety step: the first manager account must be created
        intentionally. After a manager exists, this page becomes read-only.
      </p>

      <ul>
        <li>
          Sign in first: <Link href="/signin">/signin</Link>
        </li>
        <li>
          Put a strong code in <code>apps/web/.env</code> as{" "}
          <code>INITIAL_MANAGER_SETUP_CODE</code>
        </li>
        <li>Come back here and paste it to become the first manager</li>
      </ul>

      <SetupClient
        isSignedIn={Boolean(session?.user?.id)}
        alreadyConfigured={managerCount > 0}
      />
    </main>
  );
}

