import Link from "next/link";

import { requireRole } from "@/server/require-role";
import { RoleChangesClient } from "@/app/manager/audit/RoleChangesClient";

export default async function ManagerAuditPage() {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return (
      <main className="container page">
        <section className="surface u-pad-18 u-maxw-720">
          <h1 className="u-title-26">Audit</h1>
          <p className="muted u-mt-10 u-lh-16">
            {access.reason === "unauthorized" ? "You need to sign in." : "You don’t have manager access."}
          </p>
          <Link className="btn u-mt-10" href="/signin?callbackUrl=/manager/audit">
            Go to sign-in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container page">
      <div className="rowWrap">
        <Link className="btn btn-secondary" href="/manager">
          Manager home
        </Link>
      </div>
      <RoleChangesClient />
    </main>
  );
}

