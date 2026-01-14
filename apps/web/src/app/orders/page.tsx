import Link from "next/link";

import { OrdersClient } from "@/app/orders/OrdersClient";

export default function OrdersPage() {
  return (
    <main className="container" style={{ padding: "12px 0 30px" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <Link className="btn btn-secondary" href="/menu">
          Menu
        </Link>
        <Link className="btn btn-secondary" href="/staff">
          Staff view
        </Link>
      </div>
      <OrdersClient />
    </main>
  );
}

