import Link from "next/link";

import { requireRole } from "@/server/require-role";
import { ManagerDashboardClient } from "@/app/manager/ManagerDashboardClient";

export default async function ManagerHomePage() {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return (
      <main className="container page">
        <section className="surface u-pad-18 u-maxw-720">
          <h1 className="u-title-26">Manager Portal</h1>
          <p className="muted u-mt-10 u-lh-16">
            {access.reason === "unauthorized" ? "You need to sign in." : "You don’t have manager access."}
          </p>
          <div className="u-flex-wrap-gap-10 u-mt-10">
            <Link className="btn" href="/signin?callbackUrl=/manager">
              Manager sign-in
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
        <h1 className="u-title-26">Manager dashboard</h1>
        <p className="muted u-mt-10 u-lh-16">Menu, users, orders, loyalty, and audit.</p>

        <ManagerDashboardClient />

        <section className="grid-3 u-mt-12">
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Menu</div>
            <p className="muted u-mt-8 u-lh-16">
              Manage price, availability, <code>prepSeconds</code>, and <code>loyaltyEligible</code>.
            </p>
            <Link className="btn u-mt-10" href="/manager/products">
              Open menu editor
            </Link>
          </div>
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Users</div>
            <p className="muted u-mt-8 u-lh-16">
              Promote staff, add managers, and disable accounts.
            </p>
            <Link className="btn u-mt-10" href="/manager/users">
              Open user roles
            </Link>
          </div>
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Orders</div>
            <p className="muted u-mt-8 u-lh-16">Search orders and view payment + status at a glance.</p>
            <Link className="btn u-mt-10" href="/manager/orders">
              Open orders
            </Link>
          </div>
        </section>

        <section className="grid-2 u-mt-12">
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Settings</div>
            <p className="muted u-mt-8 u-lh-16">Loyalty rules and global controls.</p>
            <Link className="btn u-mt-10" href="/manager/settings">
              Open settings
            </Link>
          </div>
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Audit</div>
            <p className="muted u-mt-8 u-lh-16">Track role changes made by managers.</p>
            <Link className="btn u-mt-10" href="/manager/audit">
              Open audit log
            </Link>
          </div>
        </section>

        <section className="grid-2 u-mt-12">
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Feedback</div>
            <p className="muted u-mt-8 u-lh-16">Read customer feedback submitted from the app.</p>
            <Link className="btn u-mt-10" href="/manager/feedback">
              Open feedback
            </Link>
          </div>
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Staff tools</div>
            <p className="muted u-mt-8 u-lh-16">Switch into staff mode to scan loyalty cards and manage the queue.</p>
            <Link className="btn u-mt-10" href="/staff/loyalty-scan">
              Switch to staff
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
