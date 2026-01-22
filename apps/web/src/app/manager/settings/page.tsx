import Link from "next/link";

import { requireRole } from "@/server/require-role";
import { SettingsClient } from "@/app/manager/settings/SettingsClient";

export default async function ManagerSettingsPage() {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return (
      <main className="container page">
        <section className="surface u-pad-18 u-maxw-720">
          <h1 className="u-title-26">Settings</h1>
          <p className="muted u-mt-10 u-lh-16">
            {access.reason === "unauthorized" ? "You need to sign in." : "You don’t have manager access."}
          </p>
          <div className="u-flex-wrap-gap-10 u-mt-10">
            <Link className="btn" href="/signin?callbackUrl=/manager/settings">
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
      <div className="rowWrap">
        <Link className="btn btn-secondary" href="/manager">
          Manager home
        </Link>
      </div>
      <SettingsClient />
    </main>
  );
}

