import Link from "next/link";

import { OrdersClient } from "@/app/orders/OrdersClient";

export default function OrdersPage() {
  return (
    <main className="container page">
      <div className="u-flex-wrap-gap-10">
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
