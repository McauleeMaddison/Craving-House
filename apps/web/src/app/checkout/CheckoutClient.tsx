"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCart } from "@/components/cart/CartContext";
import { apiGetJson, apiPostJson } from "@/lib/api";
import { calculatePrepSeconds } from "@/lib/prep-time";
import { formatMoneyGBP } from "@/lib/sample-data";
import { useEffect } from "react";

type ProductDto = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  prepSeconds: number;
  loyaltyEligible: boolean;
};

export function CheckoutClient() {
  const router = useRouter();
  const cart = useCart();
  const [pickupName, setPickupName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [authError, setAuthError] = useState<string>("");

  const items = useMemo(() => {
    return cart.lines
      .map((l) => {
        const item = products.find((x) => x.id === l.itemId);
        return item ? { item, qty: l.qty } : null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [cart.lines, products]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiGetJson<{ products: ProductDto[] }>("/api/menu");
      if (!mounted) return;
      if (res.ok) setProducts(res.data.products);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const subtotalCents = items.reduce((sum, x) => sum + x.qty * x.item.priceCents, 0);
  const prepSeconds = calculatePrepSeconds({
    baseSeconds: 120,
    items: items.map((x) => ({ qty: x.qty, prepSeconds: x.item.prepSeconds }))
  });
  const eligibleCoffeeCount = items.reduce((sum, x) => sum + (x.item.loyaltyEligible ? x.qty : 0), 0);

  const etaText = useMemo(() => {
    const minutes = Math.max(1, Math.round(prepSeconds / 60));
    return `${minutes} min`;
  }, [prepSeconds]);

  async function placeOrder() {
    if (!pickupName.trim()) return;
    if (items.length === 0) return;
    setSubmitting(true);
    setAuthError("");
    try {
      const res = await apiPostJson<{ id: string }>("/api/orders", {
        pickupName,
        notes,
        items: items.map((x) => ({ productId: x.item.id, qty: x.qty }))
      });
      if (!res.ok) {
        if (res.status === 401) {
          setAuthError("Please sign in to place an order.");
          return;
        }
        setAuthError(res.error);
        return;
      }
      cart.clear();
      router.push(`/orders/${res.data.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="surface" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Checkout</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Your cart is empty.
        </p>
        <a className="btn" href="/menu" style={{ marginTop: 10 }}>
          Browse menu
        </a>
      </section>
    );
  }

  return (
    <>
      <section className="surface" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Checkout</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Pay in store. We’ll prepare your order and you’ll collect it when it’s ready.
        </p>

        <div className="grid-2" style={{ marginTop: 14 }}>
          <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Pickup</div>
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              ASAP estimate based on items: <span style={{ color: "var(--text)", fontWeight: 800 }}>{etaText}</span>
            </div>
            <div className="pill" style={{ marginTop: 10 }}>
              Prep times are manager-managed
            </div>
          </div>

          <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Loyalty</div>
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Eligible coffees in this order: <span style={{ color: "var(--text)", fontWeight: 800 }}>{eligibleCoffeeCount}</span>
            </div>
            <div className="pill" style={{ marginTop: 10 }}>
              Buy 5 eligible coffees = 1 reward
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span className="muted" style={{ fontSize: 13 }}>
              Name for pickup
            </span>
            <input
              className="input"
              value={pickupName}
              onChange={(e) => setPickupName(e.target.value)}
              placeholder="e.g. Sam"
              autoComplete="name"
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="muted" style={{ fontSize: 13 }}>
              Notes (optional)
            </span>
            <textarea
              className="input"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Oat milk please"
            />
          </label>
        </div>
      </section>

      <section className="surface" style={{ padding: 18, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Total</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Pay in store
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{formatMoneyGBP(subtotalCents)}</div>
        </div>

        <button
          className="btn"
          style={{ marginTop: 14, width: "100%" }}
          onClick={placeOrder}
          disabled={submitting || pickupName.trim().length === 0}
        >
          {submitting ? "Placing order..." : "Place order"}
        </button>
        {authError ? (
          <p className="muted" style={{ marginTop: 10, color: "var(--danger)" }}>
            {authError}{" "}
            <a href="/signin" style={{ textDecoration: "underline" }}>
              Sign in
            </a>
          </p>
        ) : null}
        <p className="muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6 }}>
          Orders are stored in the shared database so staff devices can see the queue.
        </p>
      </section>
    </>
  );
}
