"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetJson, apiPostJson } from "@/lib/api";
import { formatCustomizations } from "@/lib/drink-customizations";
import { formatMoneyGBP } from "@/lib/sample-data";

type OrderStatus = "received" | "accepted" | "ready" | "collected" | "canceled";
type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

type ManagerOrderDto = {
  id: string;
  createdAtIso: string;
  status: OrderStatus;
  paymentStatus: string;
  paidAtIso: string | null;
  estimatedReadyAtIso: string | null;
  collectedAtIso: string | null;
  totalCents: number;
  pickupName: string;
  customerEmail: string | null;
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

export function ManagerOrdersClient() {
  const [orders, setOrders] = useState<ManagerOrderDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");

  async function refresh(overrides?: {
    paymentStatus?: PaymentStatus | "";
    q?: string;
    status?: OrderStatus | "";
  }) {
    setLoading(true);
    setError("");
    const queryValue = overrides?.q ?? q;
    const statusValue = overrides?.status ?? status;
    const paymentValue = overrides?.paymentStatus ?? paymentStatus;
    const qs = new URLSearchParams();
    if (queryValue.trim()) qs.set("q", queryValue.trim());
    if (statusValue) qs.set("status", statusValue);
    if (paymentValue) qs.set("paymentStatus", paymentValue);
    qs.set("limit", "100");
    const res = await apiGetJson<{ orders: ManagerOrderDto[] }>(`/api/manager/orders?${qs.toString()}`);
    if (!res.ok) {
      setError(res.status === 401 ? "Sign in as manager." : res.error);
      setOrders([]);
      setLoading(false);
      return;
    }
    setOrders(res.data.orders);
    setLoading(false);
  }

  function resetFilters() {
    const cleared = { q: "", status: "" as const, paymentStatus: "" as const };
    setQ(cleared.q);
    setStatus(cleared.status);
    setPaymentStatus(cleared.paymentStatus);
    setError("");
    setNotice("");
    void refresh(cleared);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(() => orders.filter((o) => o.status !== "collected" && o.status !== "canceled"), [orders]);
  const done = useMemo(() => orders.filter((o) => o.status === "collected" || o.status === "canceled"), [orders]);

  function updateStatus(orderId: string, next: OrderStatus) {
    void (async () => {
      if (next === "canceled" && !confirm("Cancel this order?")) return;
      setUpdatingId(orderId);
      setError("");
      setNotice("");
      const res = await apiPostJson<{ ok: true }>(`/api/staff/orders/${orderId}/status`, { status: next });
      if (!res.ok) {
        setError(res.error);
        setUpdatingId("");
        return;
      }
      await refresh();
      setUpdatingId("");
      setNotice(`Order updated to ${next}.`);
    })();
  }

  return (
    <>
      <section className="surface u-pad-18">
        <div className="u-flex-between-wrap">
          <div>
            <h1 className="u-title-26">Orders</h1>
            <p className="muted u-mt-10 u-lh-16">
              Search across pickup names and customer emails. Managers can also update statuses.
            </p>
            {error ? <p className="muted u-mt-10 u-danger" role="alert">{error}</p> : null}
            {notice ? <p className="muted u-mt-10" aria-live="polite">{notice}</p> : null}
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="grid-2 u-mt-12">
          <label className="u-grid-gap-8">
            <span className="muted u-fs-12">Search orders</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pickup / email…" />
          </label>
          <label className="u-grid-gap-8">
            <span className="muted u-fs-12">Status filter</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}>
              <option value="">All statuses</option>
              <option value="received">received</option>
              <option value="accepted">accepted</option>
              <option value="ready">ready</option>
              <option value="collected">collected</option>
              <option value="canceled">canceled</option>
            </select>
          </label>
        </div>

        <div className="grid-2 u-mt-10">
          <label className="u-grid-gap-8">
            <span className="muted u-fs-12">Payment filter</span>
            <select className="input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus | "")}>
              <option value="">All payments</option>
              <option value="paid">paid</option>
              <option value="pending">pending</option>
              <option value="unpaid">unpaid</option>
              <option value="failed">failed</option>
              <option value="refunded">refunded</option>
            </select>
          </label>
          <div className="u-flex-wrap-gap-10">
            <button className="btn" type="button" onClick={() => void refresh()} disabled={loading}>
              Apply filters
            </button>
            <button className="btn btn-secondary" type="button" onClick={resetFilters} disabled={loading}>
              Reset
            </button>
          </div>
        </div>

        <div className="rowWrap u-mt-10">
          <span className="pill">Active: {active.length}</span>
          <span className="pill">Completed: {done.length}</span>
        </div>
      </section>

      <section className="u-mt-12">
        <h2 className="sectionLabel">Active</h2>
        {loading ? (
          <div className="surface u-pad-16">
            <p className="muted u-m-0" aria-live="polite">Loading orders…</p>
          </div>
        ) : null}
        {!loading && active.length === 0 ? (
          <div className="surface u-pad-16">
            <p className="muted u-m-0">No active orders.</p>
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
                      Status: {o.status} • Payment: {o.paymentStatus} • Created: {formatTime(o.createdAtIso)} • ETA:{" "}
                      {o.estimatedReadyAtIso ? formatTime(o.estimatedReadyAtIso) : "—"}
                    </div>
                    <div className="muted u-mt-4 u-fs-12">
                      Customer: {o.customerEmail ?? "—"}
                    </div>
                  </div>
                  <div className="u-flex-wrap-gap-10-center">
                    {nextActions(o.status).map((a) => (
                      <button
                        key={a.status}
                        className={a.kind === "danger" ? "btn btn-danger" : "btn"}
                        type="button"
                        onClick={() => updateStatus(o.id, a.status)}
                        disabled={updatingId === o.id}
                      >
                        {updatingId === o.id ? "Saving…" : a.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="u-mt-12 u-grid-gap-8">
                  {o.lines.map((l) => (
                    <div key={l.itemId} className="surface surfaceInset u-pad-12">
                      <div className="u-flex-between">
                        <div>
                          <div className="u-fw-800">
                            {l.qty}× {l.name}
                          </div>
                          {formatCustomizations(l.customizations) ? (
                            <div className="muted u-mt-6 u-fs-12 u-lh-15">{formatCustomizations(l.customizations)}</div>
                          ) : null}
                        </div>
                        <div className="muted u-fs-13">{l.loyaltyEligible ? "Eligible" : "—"}</div>
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
        {!loading && done.length === 0 ? (
          <div className="surface u-pad-16">
            <p className="muted u-m-0">None yet.</p>
          </div>
        ) : (
          <div className="u-grid-gap-10">
            {done.slice(0, 25).map((o) => (
              <div key={o.id} className="surface surfaceInset u-pad-14">
                <div className="u-flex-between-wrap">
                  <div className="u-fw-800">
                    {o.pickupName} • {o.status} • {formatMoneyGBP(o.totalCents)}
                  </div>
                  <div className="muted u-fs-13">{formatTime(o.createdAtIso)}</div>
                </div>
                <div className="muted u-mt-6 u-fs-12">Customer: {o.customerEmail ?? "—"} • Payment: {o.paymentStatus}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
