import Link from "next/link";
import { redirect } from "next/navigation";

import { LoyaltyScanClient } from "@/features/staff/LoyaltyScanClient";
import { requireRole } from "@/server/auth/access";

export default async function ManagerLoyaltyScanPage() {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    if (access.reason === "mfa_required") {
      redirect("/manager/settings");
    }

    return (
      <main className="container page">
        <section className="surface u-pad-18 u-maxw-720">
          <h1 className="u-title-26">Loyalty scan</h1>
          <p className="muted u-mt-10 u-lh-16">
            {access.reason === "unauthorized"
              ? "You need to sign in."
              : "You don’t have manager access."}
          </p>
          <Link className="btn u-mt-10" href="/signin?callbackUrl=/manager/loyalty-scan">
            Go to sign-in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container page">
      <div className="u-flex-wrap-gap-10">
        <Link className="btn btn-secondary" href="/manager">
          Manager home
        </Link>
        <Link className="btn btn-secondary" href="/manager/orders">
          Orders
        </Link>
      </div>
      <LoyaltyScanClient />
    </main>
  );
}
