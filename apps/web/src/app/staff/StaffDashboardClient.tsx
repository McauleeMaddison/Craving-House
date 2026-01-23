"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetJson } from "@/lib/api";

type StaffOrderDto = {
  id: string;
  createdAtIso: string;
  status: "received" | "accepted" | "ready" | "collected" | "canceled";
};

function minutesSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

export function StaffDashboardClient() {
  const [orders, setOrders] = useState<StaffOrderDto[]>([]);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await apiGetJson<{ orders: StaffOrderDto[] }>("/api/staff/orders");
    if (!res.ok) {
      setError(res.status === 401 ? "Please sign in." : res.error);
      setOrders([]);
      return;
    }
    setError("");
    setOrders(res.data.orders);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const stats = useMemo(() => {
    const received = orders.filter((o) => o.status === "received").length;
    const accepted = orders.filter((o) => o.status === "accepted").length;
    const ready = orders.filter((o) => o.status === "ready").length;
    const oldestIso = orders.length ? orders.map((o) => o.createdAtIso).sort()[0] : "";
    return { received, accepted, ready, oldestIso };
  }, [orders]);

  return (
    <section className="u-mt-12">
      {error ? <p className="muted u-danger">{error}</p> : null}

      <div className="grid-3">
        <div className="surface surfaceInset u-pad-16">
          <div className="muted u-fs-12">Received</div>
          <div className="u-fw-900 u-fs-18 u-mt-6">{stats.received}</div>
          <div className="muted u-fs-12 u-mt-6">New orders waiting</div>
        </div>
        <div className="surface surfaceInset u-pad-16">
          <div className="muted u-fs-12">In progress</div>
          <div className="u-fw-900 u-fs-18 u-mt-6">{stats.accepted}</div>
          <div className="muted u-fs-12 u-mt-6">Accepted orders</div>
        </div>
        <div className="surface surfaceInset u-pad-16">
          <div className="muted u-fs-12">Ready</div>
          <div className="u-fw-900 u-fs-18 u-mt-6">{stats.ready}</div>
          <div className="muted u-fs-12 u-mt-6">
            Oldest: {stats.oldestIso ? `${minutesSince(stats.oldestIso)} min ago` : "—"}
          </div>
        </div>
      </div>

      <div className="rowWrap u-mt-10">
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            setError("");
            void refresh();
          }}
        >
          Refresh stats
        </button>
      </div>
    </section>
  );
}
