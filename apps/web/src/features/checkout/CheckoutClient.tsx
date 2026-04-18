"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { useCart } from "@/components/cart/CartContext";
import { apiGetJson, apiPostJson } from "@/lib/api";
import { formatCustomizations } from "@/lib/drink-customizations";
import { getLineUnitPriceCents, getPickupSmallOrderFeeCents, PICKUP_SMALL_ORDER_THRESHOLD_CENTS } from "@/lib/order-pricing";
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
  const { data: session, status: authStatus } = useSession();
  const signedIn = authStatus === "authenticated";
  const cart = useCart();
  const [pickupName, setPickupName] = useState("");
  const [notes, setNotes] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<"express" | "standard">("express");
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const [authError, setAuthError] = useState<string>("");
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const pickupNameInputRef = useRef<HTMLInputElement | null>(null);
  const clientRequestIdRef = useRef<string | null>(null);
  const suggestedPickupName = useMemo(() => {
    const raw = typeof session?.user?.name === "string" ? session.user.name.trim() : "";
    return raw || "";
  }, [session?.user?.name]);

  const items = useMemo(() => {
    return cart.lines
      .map((l) => {
        const item = products.find((x) => x.id === l.itemId);
        if (!item || !item.available) return null;
        return {
          item,
          qty: l.qty,
          customizations: l.customizations,
          unitPriceCents: getLineUnitPriceCents(item.priceCents, l.customizations)
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [cart.lines, products]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiGetJson<{ products: ProductDto[] }>("/api/menu");
      if (!mounted) return;
      if (res.ok) {
        setProducts(res.data.products);
        setCatalogReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!catalogReady) return;

    const productById = new Map(products.map((product) => [product.id, product]));
    const invalidLines = cart.lines.filter((line) => {
      const product = productById.get(line.itemId);
      return !product || !product.available;
    });
    if (invalidLines.length === 0) return;

    invalidLines.forEach((line) => {
      cart.remove(line.id);
    });
    setCartNotice(
      invalidLines.length === 1
        ? "1 unavailable item was removed from your cart."
        : `${invalidLines.length} unavailable items were removed from your cart.`
    );
  }, [catalogReady, products, cart]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch("/api/payments/stripe/enabled", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as any;
      if (!mounted) return;
      setStripeEnabled(Boolean(json?.enabled));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const subtotalCents = items.reduce((sum, x) => sum + x.qty * x.unitPriceCents, 0);
  const serviceFeeCents = getPickupSmallOrderFeeCents(subtotalCents);
  const totalCents = subtotalCents + serviceFeeCents;
  const prepSeconds = calculatePrepSeconds({
    baseSeconds: 120,
    items: items.map((x) => ({ qty: x.qty, prepSeconds: x.item.prepSeconds }))
  });
  const eligibleCoffeeCount = items.reduce((sum, x) => sum + (x.item.loyaltyEligible ? x.qty : 0), 0);

  const etaText = useMemo(() => {
    const minutes = Math.max(1, Math.round(prepSeconds / 60));
    return `${minutes} min`;
  }, [prepSeconds]);
  const authErrorNeedsSignIn = /sign in|unauthorized/i.test(authError);
  const checkoutDraftKey = useMemo(() => {
    return JSON.stringify({
      pickupName: pickupName.trim(),
      guestEmail: signedIn ? "" : guestEmail.trim().toLowerCase(),
      notes: notes.trim(),
      items: items.map((x) => ({
        productId: x.item.id,
        qty: x.qty,
        customizations: x.customizations ?? null
      }))
    });
  }, [guestEmail, items, notes, pickupName, signedIn]);

  useEffect(() => {
    clientRequestIdRef.current = null;
  }, [checkoutDraftKey]);

  useEffect(() => {
    if (!signedIn || !suggestedPickupName || pickupName.trim()) return;
    setPickupName(suggestedPickupName);
  }, [pickupName, signedIn, suggestedPickupName]);

  async function placeOrder() {
    setAuthError("");
    if (!pickupName.trim()) {
      setAuthError("Please enter a name for pickup.");
      pickupNameInputRef.current?.focus();
      return;
    }
    if (!signedIn && !guestEmail.trim()) {
      setAuthError("Email is required for guest checkout.");
      return;
    }
    if (!stripeEnabled) {
      setAuthError("Online payments are currently unavailable. Please try again shortly.");
      return;
    }
    if (items.length === 0) {
      setAuthError("Your cart is empty.");
      return;
    }
    setSubmitting(true);
    try {
      const clientRequestId =
        clientRequestIdRef.current ??
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      clientRequestIdRef.current = clientRequestId;

      const res = await apiPostJson<{ id: string; guestToken: string | null }>("/api/orders", {
        clientRequestId,
        pickupName,
        guestEmail: signedIn ? undefined : guestEmail.trim().toLowerCase(),
        notes,
        items: items.map((x) => ({ productId: x.item.id, qty: x.qty, customizations: x.customizations ?? null }))
      });
      if (!res.ok) {
        setAuthError(res.error);
        return;
      }
      const orderId = res.data.id;
      const guestToken = res.data.guestToken;

      const payRes = await apiPostJson<{ url: string }>("/api/payments/stripe/create-session", {
        orderId,
        guestToken: guestToken ?? undefined,
        express: signedIn && checkoutMode === "express"
      });
      if (!payRes.ok) {
        setAuthError(payRes.status === 401 ? "Please sign in to pay." : payRes.error);
        router.push(guestToken ? `/orders/guest/${guestToken}` : `/orders/${orderId}`);
        return;
      }

      cart.clear();
      window.location.href = payRes.data.url;
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
        {cartNotice ? (
          <p className="muted u-mt-8 u-lh-16">
            {cartNotice}
          </p>
        ) : null}
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
          Pay at checkout to confirm your order. We’ll prepare it once payment is successful.
        </p>
        {cartNotice ? (
          <p className="muted u-mt-8 u-lh-16">
            {cartNotice}
          </p>
        ) : null}

        <div className="grid-2 u-mt-14">
          <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Pickup</div>
            <div className="muted u-mt-8 u-lh-16">
              ASAP estimate based on items: <span className="orderInlineName">{etaText}</span>
            </div>
            <div className="pill u-mt-10">
              {/* Controlled by manager prep time settings */}
              Estimated preparation time
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
                  <span>
                    {formatCustomizations(x.customizations) || "No customisations"} • {formatMoneyGBP(x.unitPriceCents * x.qty)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <label className="u-grid-gap-8">
            <span className="muted u-fs-13">
              Name for pickup
            </span>
            <input
              ref={pickupNameInputRef}
              className="input"
              value={pickupName}
              onChange={(e) => {
                setPickupName(e.target.value);
                if (authError === "Please enter a name for pickup." && e.target.value.trim()) {
                  setAuthError("");
                }
              }}
              placeholder="e.g. Sam"
              autoComplete="name"
            />
          </label>

          {!signedIn ? (
            <label className="u-grid-gap-8">
              <span className="muted u-fs-13">
                Email (for receipt + tracking)
              </span>
              <input
                className="input"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </label>
          ) : null}

          <div className="surface surfaceInset u-pad-14">
            <div className="u-fw-800">Payment</div>
            {signedIn ? (
              <div className="checkoutModeRow u-mt-10">
                <button
                  className={`btn btn-secondary btnCompact ${checkoutMode === "express" ? "btnActive" : ""}`}
                  type="button"
                  onClick={() => setCheckoutMode("express")}
                >
                  Express
                </button>
                <button
                  className={`btn btn-secondary btnCompact ${checkoutMode === "standard" ? "btnActive" : ""}`}
                  type="button"
                  onClick={() => setCheckoutMode("standard")}
                >
                  Standard
                </button>
              </div>
            ) : null}
            <div className="muted u-mt-8 u-lh-16">
              {signedIn && checkoutMode === "express"
                ? "Express mode prioritises Apple Pay / Google Pay / saved cards."
                : "Online payment is required at checkout."}
            </div>
            {stripeEnabled ? (
              <p className="muted u-mt-10 u-fs-12 u-lh-16">
                {signedIn && checkoutMode === "express"
                  ? "You’ll be sent straight to Stripe Checkout with wallet and saved-card options first."
                  : signedIn
                  ? "You’ll be redirected to Stripe Checkout to pay by card or bank transfer, and you can choose to save your card for future orders."
                  : "You’ll be redirected to Stripe Checkout to pay by card or bank transfer."}
              </p>
            ) : (
              <p className="muted u-mt-10 u-fs-12 u-lh-16">
                Online payments aren’t enabled yet.
              </p>
            )}
            {stripeEnabled ? (
              <p className="muted u-mt-10 u-fs-12 u-lh-16">
                {signedIn
                  ? "Saved cards stay with Stripe and can be offered again the next time you order while signed in."
                  : "Guest checkout supports card and bank transfer payments, but saved cards are only available to signed-in customers."}
              </p>
            ) : null}
            <p className="muted u-mt-10 u-fs-12 u-lh-16">
              Bank transfer orders stay pending until Stripe confirms the funds have arrived.
            </p>
            <p className="muted u-mt-10 u-fs-12 u-lh-16">
              Pickup-only pricing. A {formatMoneyGBP(75)} small-order fee applies to baskets under{" "}
              {formatMoneyGBP(PICKUP_SMALL_ORDER_THRESHOLD_CENTS)}.
            </p>
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
            <div className="u-fw-800">Items subtotal</div>
            <div className="muted u-mt-6 u-fs-13">
              Payment required
            </div>
          </div>
          <div className="u-fw-900 u-fs-18">{formatMoneyGBP(subtotalCents)}</div>
        </div>

        {serviceFeeCents > 0 ? (
          <div className="u-flex-between-wrap u-mt-10">
            <div>
              <div className="u-fw-800">Pickup small-order fee</div>
              <div className="muted u-mt-6 u-fs-13">
                Applied because the basket is below {formatMoneyGBP(PICKUP_SMALL_ORDER_THRESHOLD_CENTS)}.
              </div>
            </div>
            <div className="u-fw-900">{formatMoneyGBP(serviceFeeCents)}</div>
          </div>
        ) : null}

        <div className="u-flex-between-wrap u-mt-10">
          <div className="u-fw-800">Total</div>
          <div className="u-fw-900 u-fs-18">{formatMoneyGBP(totalCents)}</div>
        </div>

        <button
          className="btn u-mt-14 u-w-full"
          onClick={placeOrder}
          disabled={submitting || !stripeEnabled}
        >
          {submitting
            ? "Processing..."
            : signedIn && checkoutMode === "express"
              ? "Express pay"
              : "Continue to payment"}
        </button>
        {authError ? (
          <p className="muted u-mt-10 u-danger">
            {authError}
            {authErrorNeedsSignIn ? (
              <>
                {" "}
                <a href="/signin" className="u-underline">
                  Sign in
                </a>
              </>
            ) : null}
          </p>
        ) : null}
        <p className="muted u-mt-10 u-fs-12 u-lh-16">
          Orders are stored in the shared database so staff devices can see the queue.
        </p>
      </section>
    </>
  );
}
