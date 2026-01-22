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
      <section className="surface u-pad-18">
        <div className="u-flex-between-wrap">
          <div>
            <h1 className="u-title-26">Order queue</h1>
            <p className="muted u-mt-10 u-lh-16">
              This queue is database-backed so all staff devices see the same orders.
            </p>
            {error ? (
              <p className="muted u-mt-8 u-danger">
                {error}
              </p>
            ) : null}
          </div>
          <button className="btn btn-secondary" onClick={refresh}>
            Refresh
          </button>
        </div>
      </section>

      <section className="u-mt-12">
        <h2 className="sectionLabel">Active</h2>
        {active.length === 0 ? (
          <div className="surface u-pad-16">
            <p className="muted u-m-0">
              No active orders.
            </p>
          </div>
        ) : (
          <div className="u-grid-gap-10">
            {active.map((o) => (
              <article key={o.id} className="surface u-pad-16">
                <div className="u-flex-between-wrap">
                  <div>
                    <div className="u-fw-900">
                      {o.pickupName} • {formatMoneyGBP(o.totalCents)}
                    </div>
                    <div className="muted u-mt-6 u-fs-13">
                      Status: {o.status} • Created: {formatTime(o.createdAtIso)} • ETA:{" "}
                      {o.estimatedReadyAtIso ? formatTime(o.estimatedReadyAtIso) : "—"}
                    </div>
                  </div>
                  <div className="u-flex-wrap-gap-10-center">
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

                <div className="u-mt-12 u-grid-gap-8">
                  {o.lines.map((l) => (
                    <div
                      key={l.itemId}
                      className="surface surfaceInset u-pad-12"
                    >
                      <div className="u-flex-between">
                        <div>
                          <div className="u-fw-800">
                            {l.qty}× {l.name}
                          </div>
                          {formatCustomizations(l.customizations) ? (
                            <div className="muted u-mt-6 u-fs-12 u-lh-15">
                              {formatCustomizations(l.customizations)}
                            </div>
                          ) : null}
                        </div>
                        <div className="muted u-fs-13">
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

      <section className="u-mt-16">
        <h2 className="sectionLabel">Completed</h2>
        {done.length === 0 ? (
          <div className="surface u-pad-16">
            <p className="muted u-m-0">
              None yet.
            </p>
          </div>
        ) : (
          <div className="u-grid-gap-10">
            {done.slice(0, 10).map((o) => (
              <div
                key={o.id}
                className="surface surfaceInset u-pad-14"
              >
                <div className="u-flex-between">
                  <div className="u-fw-800">
                    {o.pickupName} • {o.status}
                  </div>
                  <div className="muted u-fs-13">
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
