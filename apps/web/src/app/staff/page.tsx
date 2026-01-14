import Link from "next/link";

import { requireRole } from "@/server/require-role";

export default async function StaffHomePage() {
  const access = await requireRole(["staff", "manager"]);
  if (!access.ok) {
    return (
      <main className="container" style={{ padding: "12px 0 30px" }}>
        <section className="surface" style={{ padding: 18, maxWidth: 720 }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>Staff</h1>
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          {access.reason === "unauthorized"
            ? "You need to sign in."
            : "You don’t have staff access."}
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
        <h1 style={{ margin: 0, fontSize: 26 }}>Staff dashboard</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Next: order queue + status updates + loyalty scanning.
        </p>

        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Order queue</div>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Show incoming orders and update status.
            </p>
            <Link className="btn" href="/staff/orders" style={{ marginTop: 10 }}>
              Open queue
            </Link>
          </div>
          <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Loyalty scan</div>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Staff scan customer QR and submit eligible coffees.
            </p>
            <Link className="btn" href="/staff/loyalty-scan" style={{ marginTop: 10 }}>
              Open scan
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
