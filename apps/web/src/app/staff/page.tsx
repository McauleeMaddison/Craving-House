import Link from "next/link";

import { requireRole } from "@/server/auth/access";
import { StaffDashboardClient } from "@/features/staff/StaffDashboardClient";

export default async function StaffHomePage() {
  const actions = [
    {
      href: "/staff/orders",
      title: "Order queue",
      description: "Review incoming drinks and update status."
    },
    {
      href: "/staff/loyalty-scan",
      title: "Loyalty scan",
      description: "Scan QR codes and add eligible stamps."
    }
  ] as const;

  const access = await requireRole(["staff"]);
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
    <main className="container page pageDashboard portalDashboardPage">
      <section className="surface dashHero dashboardShell">
        <div className="dashMeta rowScroll">
          <span className="pill">Staff dashboard</span>
          <span className="pill">Live queue</span>
          <span className="pill">Loyalty collection</span>
        </div>

        <div className="dashLead">
          <div className="dashLeadTitle">Staff dashboard</div>
          <p className="muted dashLeadSub">
            Use the queue to manage orders, and the scanner to add loyalty stamps after collection.
          </p>
        </div>

        <StaffDashboardClient />

        <div className="dashboardActionGrid u-mt-12">
          {actions.map((action, index) => (
            <Link
              key={action.href}
              className={`dashboardActionCard ${index === 0 ? "dashboardActionCardPrimary" : ""}`}
              href={action.href}
            >
              <span className="dashboardActionCopy">
                <span className="dashboardActionTitle">{action.title}</span>
                <span className="dashboardActionSub">{action.description}</span>
              </span>
              <span aria-hidden="true" className="dashArrow">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
