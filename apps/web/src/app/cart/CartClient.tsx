"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartContext";
import { apiGetJson } from "@/lib/api";
import { formatCustomizations } from "@/lib/drink-customizations";
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
      <section className="surface u-pad-18">
        <h1 className="u-title-26">Cart</h1>
        <p className="muted u-mt-10 u-lh-16">
          Your cart is empty.
        </p>
        <Link className="btn u-mt-10" href="/menu">
          Browse menu
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="surface u-pad-18">
        <div className="u-flex-between-wrap">
          <div>
            <h1 className="u-title-26">Cart</h1>
            <p className="muted u-mt-10 u-lh-16">
              Pay in store. Estimated prep based on manager-set prep times.
            </p>
          </div>
          <div className="u-flex-wrap-gap-10-center">
            <div className="pill">
              Est. prep: {Math.max(1, Math.round(prepSeconds / 60))}m
            </div>
            <button className="btn btn-danger" onClick={() => cart.clear()}>
              Clear
            </button>
          </div>
        </div>

        <div className="u-mt-14 u-grid-gap-10">
          {detailed.map((x) => (
            <div
              key={x.line.id}
              className="surface surfaceInset u-pad-14"
            >
              <div className="u-flex-between">
                <div>
                  <div className="u-fw-800">{x.item!.name}</div>
                  <div className="muted u-mt-6 u-fs-13">
                    {formatMoneyGBP(x.item!.priceCents)} each
                  </div>
                  {formatCustomizations(x.line.customizations) ? (
                    <div className="muted u-mt-6 u-fs-12 u-lh-15">
                      {formatCustomizations(x.line.customizations)}
                    </div>
                  ) : null}
                </div>
                <div className="u-text-right">
                  <div className="u-fw-800">
                    {formatMoneyGBP(x.item!.priceCents * x.line.qty)}
                  </div>
                  <button
                    className="btn btn-secondary btnCompact u-mt-10"
                    onClick={() => cart.remove(x.line.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="u-flex-wrap-gap-10-center u-mt-12">
                <button
                  className="btn btn-secondary"
                  onClick={() => cart.setQty(x.line.id, Math.max(1, x.line.qty - 1))}
                >
                  −
                </button>
                <div className="pill">Qty {x.line.qty}</div>
                <button
                  className="btn btn-secondary"
                  onClick={() => cart.setQty(x.line.id, x.line.qty + 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface u-pad-18 u-mt-12">
        <div className="u-flex-between-wrap">
          <div>
            <div className="u-fw-800">Subtotal</div>
            <div className="muted u-mt-6 u-fs-13">
              Loyalty eligible coffees in this order: {eligibleCoffeeCount}
            </div>
          </div>
          <div className="u-fw-900 u-fs-18">{formatMoneyGBP(subtotalCents)}</div>
        </div>

        <button
          className="btn u-mt-14 u-w-full"
          onClick={() => (window.location.href = "/checkout")}
        >
          Continue to checkout
        </button>
      </section>
    </>
  );
}
