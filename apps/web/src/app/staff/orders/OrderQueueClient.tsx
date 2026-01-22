"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetJson, apiPostJson } from "@/lib/api";
import { formatCustomizations } from "@/lib/drink-customizations";
import { formatMoneyGBP } from "@/lib/sample-data";

type OrderStatus = "received" | "accepted" | "ready" | "collected" | "canceled";

type StaffOrderDto = {
  id: string;
  createdAtIso: string;
  status: OrderStatus;
  estimatedReadyAtIso: string | null;
  totalCents: number;
  pickupName: string;
  lines: Array<{ itemId: string; name: string; qty: number; loyaltyEligible: boolean; customizations: unknown }>;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { timeStyle: "short", dateStyle: "medium" });
}

function nextActions(status: OrderStatus): Array<{ label: string; status: OrderStatus; kind?: "danger" }> {
  switch (status) {
    case "received":
      return [
        { label: "Accept", status: "accepted" },
        { label: "Cancel", status: "canceled", kind: "danger" }
      ];
    case "accepted":
      return [
        { label: "Mark ready", status: "ready" },
        { label: "Cancel", status: "canceled", kind: "danger" }
      ];
    case "ready":
      return [
        { label: "Collected", status: "collected" },
        { label: "Cancel", status: "canceled", kind: "danger" }
      ];
    case "collected":
    case "canceled":
      return [];
  }
}

export function OrderQueueClient() {
  const [orders, setOrders] = useState<StaffOrderDto[]>([]);
  const [error, setError] = useState<string>("");

  async function refresh() {
    setError("");
    const res = await apiGetJson<{ orders: StaffOrderDto[] }>("/api/staff/orders");
    if (!res.ok) {
      setError(res.status === 401 ? "Please sign in." : res.error);
      setOrders([]);
      return;
    }
    setOrders(res.data.orders);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const active = useMemo(() => {
    return orders.filter((o) => o.status !== "collected" && o.status !== "canceled");
  }, [orders]);

  const done = useMemo(() => {
    return orders.filter((o) => o.status === "collected" || o.status === "canceled");
  }, [orders]);

  function setStatus(orderId: string, status: OrderStatus) {
    void (async () => {
      const res = await apiPostJson<{ ok: true }>(`/api/staff/orders/${orderId}/status`, { status });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await refresh();
    })();
  }

  return (
    <>
      <section className="surface" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>Order queue</h1>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
              This queue is database-backed so all staff devices see the same orders.
            </p>
            {error ? (
              <p className="muted" style={{ marginTop: 8, color: "var(--danger)" }}>
                {error}
              </p>
            ) : null}
          </div>
          <button className="btn btn-secondary" onClick={refresh}>
            Refresh
          </button>
        </div>
      </section>

      <section style={{ marginTop: 12 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 14 }}>Active</h2>
        {active.length === 0 ? (
          <div className="surface" style={{ padding: 16 }}>
            <p className="muted" style={{ margin: 0 }}>
              No active orders.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {active.map((o) => (
              <article key={o.id} className="surface" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {o.pickupName} • {formatMoneyGBP(o.totalCents)}
                    </div>
                    <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                      Status: {o.status} • Created: {formatTime(o.createdAtIso)} • ETA:{" "}
                      {o.estimatedReadyAtIso ? formatTime(o.estimatedReadyAtIso) : "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {nextActions(o.status).map((a) => (
                      <button
                        key={a.status}
                        className={a.kind === "danger" ? "btn btn-danger" : "btn"}
                        onClick={() => setStatus(o.id, a.status)}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {o.lines.map((l) => (
                    <div
                      key={l.itemId}
                      className="surface"
                      style={{ padding: 12, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>
                            {l.qty}× {l.name}
                          </div>
                          {formatCustomizations(l.customizations) ? (
                            <div className="muted" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
                              {formatCustomizations(l.customizations)}
                            </div>
                          ) : null}
                        </div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {l.loyaltyEligible ? "Eligible" : "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 14 }}>Completed</h2>
        {done.length === 0 ? (
          <div className="surface" style={{ padding: 16 }}>
            <p className="muted" style={{ margin: 0 }}>
              None yet.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {done.slice(0, 10).map((o) => (
              <div
                key={o.id}
                className="surface"
                style={{ padding: 14, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>
                    {o.pickupName} • {o.status}
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {formatTime(o.createdAtIso)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
