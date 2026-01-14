import Link from "next/link";

import { MenuClient } from "@/app/menu/MenuClient";

export default function MenuPage() {
  return (
    <main className="container" style={{ padding: "12px 0 30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <Link className="btn btn-secondary" href="/cart">
          Go to cart
        </Link>
      </div>
      <MenuClient />
    </main>
  );
}

