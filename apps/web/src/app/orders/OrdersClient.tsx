"use client";

import Link from "next/link";

import { apiGetJson } from "@/lib/api";
import { formatMoneyGBP } from "@/lib/sample-data";
import { useEffect, useState } from "react";

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
      <section className="surface" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Orders</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.6, color: "var(--danger)" }}>
          {error}
        </p>
        <Link className="btn" href="/signin" style={{ marginTop: 10 }}>
          Sign in
        </Link>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="surface" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Orders</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          No orders yet.
        </p>
        <Link className="btn" href="/menu" style={{ marginTop: 10 }}>
          Start an order
        </Link>
      </section>
    );
  }

  return (
    <section className="surface" style={{ padding: 18 }}>
      <h1 style={{ margin: 0, fontSize: 26 }}>Orders</h1>
      <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>Your recent orders.</p>
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="surface"
            style={{
              padding: 14,
              background: "rgba(255,255,255,0.04)",
              boxShadow: "none",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontWeight: 800 }}>
                {o.status?.toString?.() ?? "received"} • {formatMoneyGBP(o.totalCents ?? 0)}
              </div>
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
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
