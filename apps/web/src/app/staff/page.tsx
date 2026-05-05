import Link from "next/link";

import { PortalDashboardPage } from "@/features/dashboard/PortalDashboardPage";
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

  const access = await requireRole(["staff", "manager"], { requireManagerMfa: false });
  if (!access.ok) {
    return (
      <main className="container page">
        <section className="surface u-pad-18 u-maxw-720">
          <h1 className="u-title-26">Staff Portal</h1>
          <p className="muted u-mt-10 u-lh-16">
            {access.reason === "unauthorized" ? "You need to sign in." : "You don’t have staff or manager access."}
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
    <PortalDashboardPage
      badges={["Staff dashboard", "Live queue", "Loyalty collection"]}
      title="Staff dashboard"
      subtitle="Use the queue to manage orders, and the scanner to add loyalty stamps after collection."
      actions={actions}
    >
        <StaffDashboardClient />
    </PortalDashboardPage>
  );
}
