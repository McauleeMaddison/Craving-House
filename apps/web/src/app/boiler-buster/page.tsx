import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { BoilerBusterClient } from "@/features/boiler-buster/BoilerBusterClient";
import { canAccessBoilerBuster } from "@/lib/boiler-buster-access";
import { authOptions } from "@/server/auth/config";

export const metadata: Metadata = {
  title: "Boiler Buster | Craving House",
  description: "A quick customer tap game to play while waiting for an order."
};

export default async function BoilerBusterPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!canAccessBoilerBuster(role)) {
    const backHref = role === "manager" ? "/manager" : "/staff";

    return (
      <main className="container page">
        <section className="surface u-pad-18 u-maxw-720">
          <h1 className="u-title-26">Boiler Buster</h1>
          <p className="muted u-mt-10 u-lh-16">
            This mini-game is only available to guests and customers.
          </p>
          <div className="u-flex-wrap-gap-10 u-mt-12">
            <Link className="btn" href={backHref}>
              Back to portal
            </Link>
            <Link className="btn btn-secondary" href="/">
              Back to customer app
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="container page">
      <BoilerBusterClient />
    </main>
  );
}
