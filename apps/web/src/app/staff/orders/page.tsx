import Link from "next/link";

import { OrderQueueClient } from "@/app/staff/orders/OrderQueueClient";
import { requireRole } from "@/server/require-role";

export default async function StaffOrdersPage() {
  const access = await requireRole(["staff", "manager"]);
  if (!access.ok) {
    return (
      <main className="container page">
        <section className="surface u-pad-18 u-maxw-720">
          <h1 className="u-title-26">Order queue</h1>
          <p className="muted u-mt-10 u-lh-16">
            {access.reason === "unauthorized"
              ? "You need to sign in."
              : "You don’t have staff access."}
          </p>
          <Link className="btn u-mt-10" href="/signin">
            Go to sign-in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container page">
      <div className="u-flex-wrap-gap-10">
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
