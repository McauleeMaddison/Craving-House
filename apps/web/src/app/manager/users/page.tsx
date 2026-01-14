import Link from "next/link";

import { UsersClient } from "@/app/manager/users/UsersClient";
import { requireRole } from "@/server/require-role";

export default async function ManagerUsersPage() {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return (
      <main className="container page">
        <section className="surface" style={{ padding: 18, maxWidth: 720 }}>
          <h1 style={{ fontSize: 26 }}>Users & roles</h1>
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
    <main className="container page">
      <div className="rowWrap">
        <Link className="btn btn-secondary" href="/manager">
          Manager home
        </Link>
      </div>
      <UsersClient />
    </main>
  );
}

