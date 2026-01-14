"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartContext";
import { apiGetJson } from "@/lib/api";
import { formatMoneyGBP } from "@/lib/sample-data";
import { calculatePrepSeconds } from "@/lib/prep-time";

type ProductDto = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  prepSeconds: number;
  loyaltyEligible: boolean;
};

export function CartClient() {
  const cart = useCart();
  const [products, setProducts] = useState<ProductDto[]>([]);

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

  function findItem(itemId: string) {
    return products.find((x) => x.id === itemId);
  }

  const detailed = cart.lines
    .map((l) => {
      const item = findItem(l.itemId);
      return { line: l, item };
    })
    .filter((x) => x.item);

  const subtotalCents = detailed.reduce((sum, x) => {
    return sum + (x.item!.priceCents ?? 0) * x.line.qty;
  }, 0);

  const prepSeconds = calculatePrepSeconds({
    baseSeconds: 120,
    items: detailed.map((x) => ({
      qty: x.line.qty,
      prepSeconds: x.item!.prepSeconds
    }))
  });

  const eligibleCoffeeCount = detailed.reduce((sum, x) => {
    if (!x.item!.loyaltyEligible) return sum;
    return sum + x.line.qty;
  }, 0);

  if (detailed.length === 0) {
    return (
      <section className="surface" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Cart</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Your cart is empty.
        </p>
        <Link className="btn" href="/menu" style={{ marginTop: 10 }}>
          Browse menu
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="surface" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>Cart</h1>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
              Pay in store. Estimated prep based on manager-set prep times.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="pill">
              Est. prep: {Math.max(1, Math.round(prepSeconds / 60))}m
            </div>
            <button className="btn btn-danger" onClick={() => cart.clear()}>
              Clear
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {detailed.map((x) => (
            <div
              key={x.item!.id}
              className="surface"
              style={{ padding: 14, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{x.item!.name}</div>
                  <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                    {formatMoneyGBP(x.item!.priceCents)} each
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800 }}>
                    {formatMoneyGBP(x.item!.priceCents * x.line.qty)}
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: 10, padding: "8px 10px" }}
                    onClick={() => cart.remove(x.item!.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => cart.setQty(x.item!.id, Math.max(1, x.line.qty - 1))}
                >
                  −
                </button>
                <div className="pill">Qty {x.line.qty}</div>
                <button
                  className="btn btn-secondary"
                  onClick={() => cart.setQty(x.item!.id, x.line.qty + 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface" style={{ padding: 18, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Subtotal</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Loyalty eligible coffees in this order: {eligibleCoffeeCount}
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{formatMoneyGBP(subtotalCents)}</div>
        </div>

        <button
          className="btn"
          style={{ marginTop: 14, width: "100%" }}
          onClick={() => (window.location.href = "/checkout")}
        >
          Continue to checkout
        </button>
      </section>
    </>
  );
}
