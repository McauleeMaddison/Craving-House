import Link from "next/link";
import type { ReactNode } from "react";

type DashboardAction = {
  href: string;
  title: string;
  description: string;
  primary?: boolean;
};

type PortalDashboardPageProps = {
  badges: readonly string[];
  title: string;
  subtitle: string;
  actions: readonly DashboardAction[];
  actionGridClassName?: string;
  children?: ReactNode;
};

export function PortalDashboardPage({
  badges,
  title,
  subtitle,
  actions,
  actionGridClassName,
  children
}: PortalDashboardPageProps) {
  const gridClassName = actionGridClassName
    ? `dashboardActionGrid ${actionGridClassName} u-mt-12`
    : "dashboardActionGrid u-mt-12";

  return (
    <main className="container page pageDashboard portalDashboardPage">
      <section className="surface dashHero dashboardShell">
        <div className="dashMeta rowScroll">
          {badges.map((badge) => (
            <span key={badge} className="pill">
              {badge}
            </span>
          ))}
        </div>

        <div className="dashLead">
          <h1 className="dashLeadTitle">{title}</h1>
          <p className="muted dashLeadSub">{subtitle}</p>
        </div>

        {children}

        <div className={gridClassName}>
          {actions.map((action, index) => {
            const isPrimary = action.primary ?? index === 0;

            return (
              <Link
                key={action.href}
                className={`dashboardActionCard ${isPrimary ? "dashboardActionCardPrimary" : ""}`}
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
            );
          })}
        </div>
      </section>
    </main>
  );
}
