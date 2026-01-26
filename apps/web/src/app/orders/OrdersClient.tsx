"use client";

import Link from "next/link";

import { apiGetJson } from "@/lib/api";
import { formatMoneyGBP } from "@/lib/sample-data";
import { useEffect, useState } from "react";
import { CustomerNotificationsClient } from "@/app/orders/CustomerNotificationsClient";

type OrderDto = {
  id: string;
  createdAtIso: string;
  status: string;
  estimatedReadyAtIso: string | null;
  totalCents: number;
  pickupName: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function OrdersClient() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiGetJson<{ orders: OrderDto[] }>("/api/orders");
      if (!mounted) return;
      if (!res.ok) {
        setError(res.status === 401 ? "Please sign in to view your orders." : res.error);
        setOrders([]);
        return;
      }
      setOrders(res.data.orders);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <section className="surface u-pad-18">
        <h1 className="u-title-26">Orders</h1>
        <p className="muted u-mt-10 u-lh-16 u-danger">
          {error}
        </p>
        <Link className="btn u-mt-10" href="/signin">
          Sign in
        </Link>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="surface u-pad-18">
        <h1 className="u-title-26">Orders</h1>
        <p className="muted u-mt-10 u-lh-16">
          No orders yet.
        </p>
        <Link className="btn u-mt-10" href="/menu">
          Start an order
        </Link>
      </section>
    );
  }

  return (
    <section className="surface u-pad-18">
      <h1 className="u-title-26">Orders</h1>
      <p className="muted u-mt-10 u-lh-16">Your recent orders.</p>
      <CustomerNotificationsClient />
      <div className="u-mt-14 u-grid-gap-10">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="surface surfaceInset u-pad-14 ordersListItem"
          >
            <div>
              <div className="u-fw-800">
                {o.status?.toString?.() ?? "received"} • {formatMoneyGBP(o.totalCents ?? 0)}
              </div>
              <div className="muted u-mt-6 u-fs-13">
                {formatDateTime(o.createdAtIso)}
              </div>
            </div>
            <div className="pill">View</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
