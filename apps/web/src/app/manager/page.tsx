import Link from "next/link";

import { requireRole } from "@/server/require-role";

export default async function ManagerHomePage() {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return (
      <main className="container" style={{ padding: "12px 0 30px" }}>
        <section className="surface" style={{ padding: 18, maxWidth: 720 }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>Manager</h1>
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          {access.reason === "unauthorized"
            ? "You need to sign in."
            : "You don’t have manager access."}
          </p>
          <Link className="btn" href="/signin" style={{ marginTop: 10 }}>
            Go to sign-in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: "12px 0 30px" }}>
      <section className="surface" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Manager dashboard</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Next: menu management (prices, availability, prep times, loyalty eligibility), staff
          management, and feedback moderation.
        </p>

        <section className="grid-3" style={{ marginTop: 12 }}>
          <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Menu</div>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Manage price, availability, <code>prepSeconds</code>, and <code>loyaltyEligible</code>.
            </p>
            <Link className="btn" href="/manager/products" style={{ marginTop: 10 }}>
              Open menu editor
            </Link>
          </div>
          <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Users</div>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Promote staff, add managers, and disable accounts.
            </p>
            <Link className="btn" href="/manager/users" style={{ marginTop: 10 }}>
              Open user roles
            </Link>
          </div>
          <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Feedback</div>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Moderate reviews/feedback and reply.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
