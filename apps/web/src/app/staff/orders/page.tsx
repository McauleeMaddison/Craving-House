import Link from "next/link";

import { OrderQueueClient } from "@/app/staff/orders/OrderQueueClient";
import { requireRole } from "@/server/require-role";

export default async function StaffOrdersPage() {
  const access = await requireRole(["staff", "manager"]);
  if (!access.ok) {
    return (
      <main className="container page">
        <section className="surface" style={{ padding: 18, maxWidth: 720 }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>Order queue</h1>
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
    <main className="container page">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn btn-secondary" href="/staff">
          Staff home
        </Link>
        <Link className="btn btn-secondary" href="/staff/loyalty-scan">
          Loyalty scan
        </Link>
      </div>
      <OrderQueueClient />
    </main>
  );
}
