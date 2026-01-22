import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { authOptions } from "@/server/auth";
import { SetupClient } from "@/app/setup/SetupClient";

export default async function SetupPage() {
  const session = await getServerSession(authOptions);
  const managerCount = await prisma.user.count({ where: { role: "manager" } });

  if (managerCount > 0) {
    if (session?.user?.role === "manager") {
      redirect("/manager/users");
    }
    notFound();
  }

  return (
    <main className="container page u-maxw-860">
      <section className="surface u-pad-18">
        <h1 className="u-title-26">Initial setup</h1>
      <p>
        This is a one-time safety step: the first manager account must be created
        intentionally. After a manager exists, this page is disabled.
      </p>

      <ul className="muted u-lh-18">
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
      </section>
    </main>
  );
}
