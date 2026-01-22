import Link from "next/link";

import { ProductsClient } from "@/app/manager/products/ProductsClient";
import { requireRole } from "@/server/require-role";

export default async function ManagerProductsPage() {
  const access = await requireRole(["manager"]);
  if (!access.ok) {
    return (
      <main className="container page">
        <section className="surface u-pad-18 u-maxw-720">
          <h1 className="u-title-26">Menu editor</h1>
          <p className="muted u-mt-10 u-lh-16">
            {access.reason === "unauthorized"
              ? "You need to sign in."
              : "You don’t have manager access."}
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
      <div className="rowWrap">
        <Link className="btn btn-secondary" href="/manager">
          Manager home
        </Link>
      </div>
      <ProductsClient />
    </main>
  );
}
