import Link from "next/link";

import { requireRole } from "@/server/require-role";
import { StaffDashboardClient } from "@/app/staff/StaffDashboardClient";

export default async function StaffHomePage() {
  const access = await requireRole(["staff", "manager"]);
  if (!access.ok) {
    return (
      <main className="container page">
        <section className="surface u-pad-18 u-maxw-720">
          <h1 className="u-title-26">Staff Portal</h1>
          <p className="muted u-mt-10 u-lh-16">
            {access.reason === "unauthorized" ? "You need to sign in." : "You don’t have staff access."}
          </p>
          <div className="u-flex-wrap-gap-10 u-mt-10">
            <Link className="btn" href="/signin?callbackUrl=/staff">
              Staff sign-in
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
      <section className="surface u-pad-18">
        <h1 className="u-title-26">Staff dashboard</h1>
        <p className="muted u-mt-10 u-lh-16">
          Use the queue to manage orders, and the scanner to add loyalty stamps after collection.
        </p>

        <StaffDashboardClient />

        <div className="grid-2 u-mt-12">
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Order queue</div>
            <p className="muted u-mt-8 u-lh-16">
              Show incoming orders and update status.
            </p>
            <Link className="btn u-mt-10" href="/staff/orders">
              Open queue
            </Link>
          </div>
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Loyalty scan</div>
            <p className="muted u-mt-8 u-lh-16">
              Staff scan customer QR and submit eligible coffees.
            </p>
            <Link className="btn u-mt-10" href="/staff/loyalty-scan">
              Open scan
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
