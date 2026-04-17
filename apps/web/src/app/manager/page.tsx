import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireRole } from "@/server/auth/access";
import { ManagerDashboardClient } from "@/features/manager/ManagerDashboardClient";
import { prisma } from "@/server/db";

export default async function ManagerHomePage() {
  const actions = [
    {
      href: "/manager/products",
      title: "Products",
      description: "Manage pricing, availability, and loyalty eligibility."
    },
    {
      href: "/manager/orders",
      title: "Orders",
      description: "Review queue activity and payment status."
    },
    {
      href: "/manager/users",
      title: "Users",
      description: "Promote staff, add managers, and disable access."
    },
    {
      href: "/manager/settings",
      title: "Settings",
      description: "Update loyalty rules and global controls."
    },
    {
      href: "/manager/audit",
      title: "Audit",
      description: "Track role changes and manager activity."
    },
    {
      href: "/manager/feedback",
      title: "Feedback",
      description: "Read customer comments from the app."
    }
  ] as const;

  await connection();
  const managerCount = await prisma.user.count({ where: { role: "manager", disabledAt: null } });
  const noManagers = managerCount === 0;
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    if (access.reason === "mfa_required") {
      redirect("/manager/settings");
    }
    return (
      <main className="container page">
        <section className="surface u-pad-18 u-maxw-720">
          <h1 className="u-title-26">Manager Portal</h1>
          <p className="muted u-mt-10 u-lh-16">
            {noManagers
              ? "No manager account exists yet. Complete one-time setup to create your first manager."
              : access.reason === "unauthorized"
                ? "You need to sign in."
                : "You don’t have manager access."}
          </p>
          <div className="u-flex-wrap-gap-10 u-mt-10">
            <Link className="btn" href="/signin?callbackUrl=/manager">
              Manager sign-in
            </Link>
            {noManagers ? (
              <Link className="btn btn-secondary" href="/setup">
                Create first manager
              </Link>
            ) : null}
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
          <span className="pill">Manager dashboard</span>
          <span className="pill">Operations overview</span>
          <span className="pill">Admin controls</span>
        </div>

        <div className="dashLead">
          <div className="dashLeadTitle">Manager dashboard</div>
          <p className="muted dashLeadSub">Menu, users, orders, loyalty, and audit.</p>
        </div>

        <ManagerDashboardClient />

        <div className="dashboardActionGrid dashboardActionGridManager u-mt-12">
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
