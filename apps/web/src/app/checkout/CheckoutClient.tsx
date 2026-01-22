"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCart } from "@/components/cart/CartContext";
import { apiGetJson, apiPostJson } from "@/lib/api";
import { formatCustomizations } from "@/lib/drink-customizations";
import { calculatePrepSeconds } from "@/lib/prep-time";
import { formatMoneyGBP } from "@/lib/sample-data";

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
  const [payMethod, setPayMethod] = useState<"store" | "card">("store");
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [authError, setAuthError] = useState<string>("");

  const items = useMemo(() => {
    return cart.lines
      .map((l) => {
        const item = products.find((x) => x.id === l.itemId);
        return item ? { item, qty: l.qty, customizations: l.customizations } : null;
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
        items: items.map((x) => ({ productId: x.item.id, qty: x.qty, customizations: x.customizations ?? null }))
      });
      if (!res.ok) {
        if (res.status === 401) {
          setAuthError("Please sign in to place an order.");
          return;
        }
        setAuthError(res.error);
        return;
      }
      const orderId = res.data.id;

      if (payMethod === "card") {
        const payRes = await apiPostJson<{ url: string }>("/api/payments/stripe/create-session", { orderId });
        if (!payRes.ok) {
          setAuthError(payRes.status === 401 ? "Please sign in to pay." : payRes.error);
          router.push(`/orders/${orderId}`);
          return;
        }
        cart.clear();
        window.location.href = payRes.data.url;
        return;
      }

      cart.clear();
      router.push(`/orders/${orderId}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="surface u-pad-18">
        <h1 className="u-title-26">Checkout</h1>
        <p className="muted u-mt-10 u-lh-16">
          Your cart is empty.
        </p>
        <a className="btn u-mt-10" href="/menu">
          Browse menu
        </a>
      </section>
    );
  }

  return (
    <>
      <section className="surface u-pad-18">
        <h1 className="u-title-26">Checkout</h1>
        <p className="muted u-mt-10 u-lh-16">
          Choose how you want to pay. We’ll prepare your order and you’ll collect it when it’s ready.
        </p>

        <div className="grid-2 u-mt-14">
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Pickup</div>
            <div className="muted u-mt-8 u-lh-16">
              ASAP estimate based on items: <span className="orderInlineName">{etaText}</span>
            </div>
            <div className="pill u-mt-10">
              Prep times are manager-managed
            </div>
          </div>

          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Loyalty</div>
            <div className="muted u-mt-8 u-lh-16">
              Eligible coffees in this order: <span className="orderInlineName">{eligibleCoffeeCount}</span>
            </div>
            <div className="pill u-mt-10">
              Buy 5 eligible coffees = 1 reward
            </div>
          </div>
        </div>

        <div className="u-mt-14 u-grid-gap-10">
          <div className="surface surfaceInset u-pad-14">
            <div className="u-fw-800">Items</div>
            <div className="muted u-mt-8 u-lh-16">
              Drink customisations are attached per item.
            </div>
            <div className="u-mt-10 u-grid-gap-8">
              {items.map((x) => (
                <div key={`${x.item.id}:${formatCustomizations(x.customizations)}`} className="pill pillRow">
                  <span className="u-text u-fw-900">
                    {x.qty}× {x.item.name}
                  </span>
                  <span>{formatCustomizations(x.customizations) || "No customisations"}</span>
                </div>
              ))}
            </div>
          </div>

          <label className="u-grid-gap-8">
            <span className="muted u-fs-13">
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

          <div className="surface surfaceInset u-pad-14">
            <div className="u-fw-800">Payment</div>
            <div className="muted u-mt-8 u-lh-16">
              Pay in store (fastest) or pay now by card.
            </div>
            <div className="rowWrap u-mt-10">
              <button
                className={`btn btn-secondary ${payMethod === "store" ? "btnActive" : ""}`}
                type="button"
                onClick={() => setPayMethod("store")}
              >
                Pay in store
              </button>
              <button
                className={`btn btn-secondary ${payMethod === "card" ? "btnActive" : ""}`}
                type="button"
                onClick={() => setPayMethod("card")}
              >
                Pay by card
              </button>
            </div>
            {payMethod === "card" ? (
              <p className="muted u-mt-10 u-fs-12 u-lh-16">
                You’ll be redirected to Stripe Checkout to pay securely.
              </p>
            ) : null}
          </div>

          <label className="u-grid-gap-8">
            <span className="muted u-fs-13">
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

      <section className="surface u-pad-18 u-mt-12">
        <div className="u-flex-between-wrap">
          <div>
            <div className="u-fw-800">Total</div>
            <div className="muted u-mt-6 u-fs-13">
              {payMethod === "card" ? "Pay online (card)" : "Pay in store"}
            </div>
          </div>
          <div className="u-fw-900 u-fs-18">{formatMoneyGBP(subtotalCents)}</div>
        </div>

        <button
          className="btn u-mt-14 u-w-full"
          onClick={placeOrder}
          disabled={submitting || pickupName.trim().length === 0}
        >
          {submitting ? "Processing..." : payMethod === "card" ? "Pay now" : "Place order"}
        </button>
        {authError ? (
          <p className="muted u-mt-10 u-danger">
            {authError}{" "}
            <a href="/signin" className="u-underline">
              Sign in
            </a>
          </p>
        ) : null}
        <p className="muted u-mt-10 u-fs-12 u-lh-16">
          Orders are stored in the shared database so staff devices can see the queue.
        </p>
      </section>
    </>
  );
}
