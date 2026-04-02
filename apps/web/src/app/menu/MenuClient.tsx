"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { useCart } from "@/components/cart/CartContext";
import { apiGetJson } from "@/lib/api";
import type {
  DrinkCustomizations,
  DrinkExtra,
  HotDogAddOn,
  MealAddOn,
  ProductCustomizationKind,
  Syrup,
  WaffleTopping
} from "@/lib/drink-customizations";
import {
  EXTRA_OPTIONS,
  getCustomizationUiCopy,
  getProductCustomizationKind,
  HOT_DOG_ADD_ON_OPTIONS,
  MEAL_ADD_ON_OPTIONS,
  SYRUP_OPTIONS,
  WAFFLE_TOPPING_OPTIONS
} from "@/lib/drink-customizations";
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

function AddToCartButton(props: { onAdd: () => void; disabled?: boolean }) {
  const [added, setAdded] = useState(false);
  const disabled = Boolean(props.disabled);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  return (
    <button
      className={`btn ${added ? "btnAdded" : ""}`}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        setAdded(true);
        if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = window.setTimeout(() => setAdded(false), 900);
        props.onAdd();
      }}
      type="button"
    >
      {disabled ? "Unavailable" : added ? "Added to cart" : "Add to cart"}
    </button>
  );
}

export function MenuClient() {
  const { data, status } = useSession();
  const role = (data?.user as any)?.role as string | undefined;
  const isManager = status === "authenticated" && role === "manager";
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [custom, setCustom] = useState<Record<string, DrinkCustomizations>>({});

  function updateCustom(productId: string, next: DrinkCustomizations) {
    setCustom((prev) => ({ ...prev, [productId]: next }));
  }

  function toggleArrayOption<K extends keyof DrinkCustomizations>(
    productId: string,
    field: K,
    key: NonNullable<DrinkCustomizations[K]> extends Array<infer T> ? T : never
  ) {
    const current = (custom[productId]?.[field] as string[] | undefined) ?? [];
    const next = current.includes(String(key))
      ? current.filter((x) => x !== String(key))
      : [...current, String(key)];

    updateCustom(productId, {
      ...(custom[productId] ?? {}),
      [field]: next
    } as DrinkCustomizations);
  }

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products;
    if (!q) return list;
    return list.filter((x) => {
      return (
        x.name.toLowerCase().includes(q) || x.description.toLowerCase().includes(q)
      );
    });
  }, [query, products]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiGetJson<{ products: ProductDto[] }>("/api/menu");
      if (!mounted) return;
      if (res.ok) setProducts(res.data.products);
      else setProducts([]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <div className="surface u-pad-16">
        <div className="u-flex-between-wrap">
          <div>
            <h1 className="u-title-26">Menu</h1>
            <p className="muted u-mt-8 u-lh-16">
              Manager-controlled availability, prep times, and loyalty eligibility.
            </p>
          </div>
          <div className="menuSearchWrap">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu…"
              aria-label="Search menu"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <section className="surface u-pad-16 u-mt-12">
          <div className="u-fw-900">Loading menu…</div>
          <p className="muted u-mt-8 u-lh-16">Fetching today’s items.</p>
        </section>
      ) : items.length === 0 ? (
        <section className="surface u-pad-16 u-mt-12">
          <div className="u-fw-900">No matching items</div>
          <p className="muted u-mt-8 u-lh-16">
            Try a different search, or check back shortly.
          </p>
          {isManager ? (
            <div className="u-flex-wrap-gap-10 u-mt-10">
              <Link className="btn" href="/manager/products">
                Add products (manager)
              </Link>
              <Link className="btn btn-secondary" href="/manager">
                Manager home
              </Link>
            </div>
          ) : (
            <p className="muted u-mt-10 u-fs-12 u-lh-16">
              If you’re the owner/manager, sign in and use the manager portal to add products.
            </p>
          )}
        </section>
      ) : (
        <section className="grid-2 u-mt-12">
          {items.map((item) => {
            const customizationKind = getProductCustomizationKind(item);
            const canCustomize = customizationKind !== null;
            const uiCopy = customizationKind ? getCustomizationUiCopy(customizationKind) : null;
            return (
              <article key={item.id} className="surface u-pad-16">
              <div className="u-flex-between">
                <div>
                  <div className="u-fw-800">{item.name}</div>
                  <div className="muted u-mt-6 u-lh-15">
                    {item.description}
                  </div>
                </div>
                <div className="u-text-right">
                  <div className="u-fw-800">{formatMoneyGBP(item.priceCents)}</div>
                  <div className="muted u-mt-6 u-fs-12">
                    Prep: {Math.round(item.prepSeconds / 60)}m
                  </div>
                </div>
              </div>

              <div className="u-flex-between-wrap u-mt-14">
                <div className="rowWrap">
                  <div className="pill">
                    {item.available ? "Available now" : "Temporarily unavailable"}
                  </div>
                  <div className="pill">
                    {item.loyaltyEligible ? "Earns stamp" : "No stamp"}
                  </div>
                </div>
                <div className="u-flex-wrap-gap-10-center">
                  {canCustomize ? (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={!item.available}
                      onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
                    >
                      {uiCopy?.buttonLabel}
                    </button>
                  ) : null}
                  <AddToCartButton
                    disabled={!item.available}
                    onAdd={() => cart.add(item.id, 1, canCustomize ? custom[item.id] ?? null : null)}
                  />
                </div>
              </div>

              {!item.available ? (
                <p className="muted u-mt-10 u-fs-12 u-lh-16">
                  This item is visible but cannot be ordered until it’s marked available by admin.
                </p>
              ) : null}

              {canCustomize && customizationKind && expanded[item.id] && item.available ? (
                <div className="surface surfaceInset u-pad-14 u-mt-12">
                  <div className="u-fw-900">{uiCopy?.title}</div>
                  <div className="muted u-mt-8 u-lh-16">
                    {uiCopy?.help}
                  </div>

                  <div className="u-mt-12 u-grid-gap-12">
                    {customizationKind === "drink" ? (
                      <>
                        <label className="u-grid-gap-8">
                          <span className="muted u-fs-13">Sugar</span>
                          <select
                            className="input"
                            value={String(custom[item.id]?.sugar ?? 0)}
                            onChange={(e) => {
                              const sugar = Number(e.target.value) as 0 | 1 | 2 | 3 | 4;
                              const next = { ...(custom[item.id] ?? {}) };
                              if (sugar === 0) delete next.sugar;
                              else next.sugar = sugar;
                              updateCustom(item.id, next);
                            }}
                          >
                            <option value="0">0 (none)</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                          </select>
                        </label>

                        <div className="u-grid-gap-8">
                          <span className="muted u-fs-13">Syrups</span>
                          <div className="rowWrap">
                            {SYRUP_OPTIONS.map((s) => {
                              const selected = Boolean(custom[item.id]?.syrups?.includes(s.key));
                              return (
                                <button
                                  key={s.key}
                                  type="button"
                                  className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                                  onClick={() => toggleArrayOption(item.id, "syrups", s.key as Syrup)}
                                >
                                  {s.label} (+{formatMoneyGBP(s.priceCents)})
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="u-grid-gap-8">
                          <span className="muted u-fs-13">Coffee add-ons</span>
                          <div className="rowWrap">
                            {EXTRA_OPTIONS.map((extra) => {
                              const selected = Boolean(custom[item.id]?.extras?.includes(extra.key));
                              return (
                                <button
                                  key={extra.key}
                                  type="button"
                                  className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                                  onClick={() => toggleArrayOption(item.id, "extras", extra.key as DrinkExtra)}
                                >
                                  {extra.label} (+{formatMoneyGBP(extra.priceCents)})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : null}

                    {customizationKind === "hotdog" ? (
                      <div className="u-grid-gap-8">
                        <span className="muted u-fs-13">Hot dog add-ons</span>
                        <div className="rowWrap">
                          {HOT_DOG_ADD_ON_OPTIONS.map((option) => {
                            const selected = Boolean(custom[item.id]?.hotDogAddOns?.includes(option.key));
                            return (
                              <button
                                key={option.key}
                                type="button"
                                className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                                onClick={() => toggleArrayOption(item.id, "hotDogAddOns", option.key as HotDogAddOn)}
                              >
                                {option.label} (+{formatMoneyGBP(option.priceCents)})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {customizationKind === "waffle" ? (
                      <div className="u-grid-gap-8">
                        <span className="muted u-fs-13">Waffle toppings</span>
                        <div className="rowWrap">
                          {WAFFLE_TOPPING_OPTIONS.map((option) => {
                            const selected = Boolean(custom[item.id]?.waffleToppings?.includes(option.key));
                            return (
                              <button
                                key={option.key}
                                type="button"
                                className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                                onClick={() => toggleArrayOption(item.id, "waffleToppings", option.key as WaffleTopping)}
                              >
                                {option.label} (+{formatMoneyGBP(option.priceCents)})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {customizationKind === "meal" ? (
                      <div className="u-grid-gap-8">
                        <span className="muted u-fs-13">Meal add-ons</span>
                        <div className="rowWrap">
                          {MEAL_ADD_ON_OPTIONS.map((option) => {
                            const selected = Boolean(custom[item.id]?.mealAddOns?.includes(option.key));
                            return (
                              <button
                                key={option.key}
                                type="button"
                                className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                                onClick={() => toggleArrayOption(item.id, "mealAddOns", option.key as MealAddOn)}
                              >
                                {option.label} (+{formatMoneyGBP(option.priceCents)})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
