"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiGetJson } from "@/lib/api";
import { formatCustomizations } from "@/lib/drink-customizations";
import { formatMoneyGBP } from "@/lib/sample-data";

type OrderStatus = "received" | "accepted" | "ready" | "collected" | "canceled";

type OrderDto = {
  id: string;
  createdAtIso: string;
  status: OrderStatus | string;
  paymentStatus: string;
  paidAtIso: string | null;
  estimatedReadyAtIso: string | null;
  collectedAtIso: string | null;
  totalCents: number;
  pickupName: string;
  notes: string | null;
  lines: Array<{
    itemId: string;
    name: string;
    qty: number;
    unitPriceCents: number;
    prepSeconds: number;
    loyaltyEligible: boolean;
    customizations: unknown;
  }>;
};

const steps: Array<{ key: OrderStatus; label: string; help: string }> = [
  { key: "received", label: "Received", help: "We got your order." },
  { key: "accepted", label: "Accepted", help: "We started preparing it." },
  { key: "ready", label: "Ready", help: "Collect from the counter." },
  { key: "collected", label: "Collected", help: "Enjoy!" }
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function stepIndex(status: OrderStatus) {
  if (status === "canceled") return -1;
  return steps.findIndex((s) => s.key === status);
}

export function OrderDetailsClient(props: { orderId: string }) {
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string>("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiGetJson<OrderDto>(`/api/orders/${props.orderId}`);
      if (!mounted) return;
      if (!res.ok) {
        setError(res.status === 401 ? "Please sign in to view this order." : res.error);
        setOrder(null);
        return;
      }
      setOrder(res.data);
    })();
    return () => {
      mounted = false;
    };
  }, [props.orderId]);

  const eligibleCoffeeCount = useMemo(() => {
    if (!order) return 0;
    return order.lines.reduce((sum, l) => sum + (l.loyaltyEligible ? l.qty : 0), 0);
  }, [order]);

  if (!order) {
    return (
      <section className="surface u-pad-18">
        <h1 className="u-title-26">Order</h1>
        <p
          className={`muted u-mt-10 u-lh-16 ${error ? "u-danger" : ""}`}
        >
          {error || "Loading..."}
        </p>
        <div className="u-flex-wrap-gap-10 u-mt-12">
          <Link className="btn btn-secondary" href="/orders">
            Back to orders
          </Link>
          {error.includes("sign in") ? (
            <Link className="btn" href="/signin">
              Sign in
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  const status = (order.status as OrderStatus) || "received";

  if (status === "canceled") {
    return (
      <section className="surface u-pad-18">
        <h1 className="u-title-26">Order canceled</h1>
        <p className="muted u-mt-10">
          If this is unexpected, please contact the shop.
        </p>
        <Link className="btn u-mt-10" href="/menu">
          Start a new order
        </Link>
      </section>
    );
  }

  const idx = stepIndex(status);
  const paymentLabel =
    order.paymentStatus === "paid"
      ? "Paid online"
      : order.paymentStatus === "pending"
        ? "Payment pending"
        : "Pay in store";

  return (
    <>
      <section className="surface u-pad-18">
        <div className="u-flex-between-wrap">
          <div>
            <h1 className="u-title-26">Order confirmed</h1>
            <p className="muted u-mt-10 u-lh-16">
              Pickup name: <span className="orderInlineName">{order.pickupName}</span> •{" "}
              {paymentLabel}
            </p>
          </div>
          <div className="u-text-right">
            <div className="pill">Total: {formatMoneyGBP(order.totalCents)}</div>
            <div className="muted u-mt-8 u-fs-12">
              Created: {formatDateTime(order.createdAtIso)}
            </div>
          </div>
        </div>
      </section>

      <section className="surface u-pad-18 u-mt-12">
        <div className="u-flex-between-wrap">
          <div>
            <div className="u-fw-800">Status</div>
            <div className="muted u-mt-6">
              Estimated ready:{" "}
              {order.estimatedReadyAtIso ? formatDateTime(order.estimatedReadyAtIso) : "—"}
            </div>
          </div>
          <div className="pill">
            Loyalty eligible coffees: {eligibleCoffeeCount}
          </div>
        </div>

        <div className="u-mt-14 u-grid-gap-10">
          {steps.map((s, i) => {
            const done = i <= idx;
            return (
              <div
                key={s.key}
                className={`surface orderStepCard ${done ? "orderStepCardDone" : ""}`}
              >
                <div className="u-flex-between">
                  <div className="u-fw-900">{s.label}</div>
                  <div className="pill">{done ? "Done" : "Pending"}</div>
                </div>
                <div className="muted u-mt-8 u-lh-16">
                  {s.help}
                </div>
              </div>
            );
          })}
        </div>

        <div className="u-flex-wrap-gap-10 u-mt-14">
          <Link className="btn btn-secondary" href="/orders">
            All orders
          </Link>
          <Link className="btn" href="/loyalty">
            Loyalty card
          </Link>
          {order.paymentStatus !== "paid" ? (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={async () => {
                setPayError("");
                setPaying(true);
                try {
                  const res = await fetch("/api/payments/stripe/create-session", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ orderId: order.id })
                  });
                  const json = (await res.json().catch(() => ({}))) as any;
                  if (!res.ok) {
                    setPayError(json?.error || "Could not start payment.");
                    return;
                  }
                  if (json?.url) window.location.href = String(json.url);
                } catch {
                  setPayError("Could not start payment.");
                } finally {
                  setPaying(false);
                }
              }}
              disabled={paying}
              title="Pay securely with card"
            >
              {paying ? "Opening Stripe..." : "Pay by card"}
            </button>
          ) : null}
        </div>
        {payError ? (
          <p className="muted u-mt-10 u-danger">
            {payError}
          </p>
        ) : null}
      </section>

      <section className="surface u-pad-18 u-mt-12">
        <div className="u-fw-800">Items</div>
        <div className="u-mt-12 u-grid-gap-10">
          {order.lines.map((l) => (
            <div
              key={l.itemId}
              className="surface surfaceInset u-pad-14"
            >
              <div className="u-flex-between">
                <div>
                  <div className="u-fw-800">{l.name}</div>
                  <div className="muted u-mt-6 u-fs-13">
                    Qty {l.qty} • {formatMoneyGBP(l.unitPriceCents)} each
                    {l.loyaltyEligible ? " • Earns stamp" : ""}
                  </div>
                  {formatCustomizations(l.customizations) ? (
                    <div className="muted u-mt-6 u-fs-12 u-lh-15">
                      {formatCustomizations(l.customizations)}
                    </div>
                  ) : null}
                </div>
                <div className="u-fw-900">{formatMoneyGBP(l.unitPriceCents * l.qty)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
