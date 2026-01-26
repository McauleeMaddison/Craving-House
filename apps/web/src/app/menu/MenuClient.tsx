"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { useCart } from "@/components/cart/CartContext";
import { apiGetJson } from "@/lib/api";
import type { DrinkCustomizations, Syrup } from "@/lib/drink-customizations";
import { SYRUP_OPTIONS } from "@/lib/drink-customizations";
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

function AddToCartButton(props: { onAdd: () => void }) {
  const [burstKey, setBurstKey] = useState(0);

  return (
    <button
      className="btn btn-burst"
      onClick={() => {
        setBurstKey((k) => k + 1);
        props.onAdd();
      }}
      type="button"
    >
      Add to cart
      <span key={burstKey} className="beanBurst" aria-hidden="true" />
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

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => p.available);
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
              Manager-controlled prep times and loyalty eligibility. (Sample data for now.)
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
          <div className="u-fw-900">No items available</div>
          <p className="muted u-mt-8 u-lh-16">
            The menu hasn’t been set up yet, or all items are marked unavailable.
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
          {items.map((item) => (
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
                <div className="pill">
                  {item.loyaltyEligible ? "Earns stamp" : "No stamp"}
                </div>
                <div className="u-flex-wrap-gap-10-center">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
                  >
                    Customise
                  </button>
                  <AddToCartButton onAdd={() => cart.add(item.id, 1, custom[item.id] ?? null)} />
                </div>
              </div>

              {expanded[item.id] ? (
                <div className="surface surfaceInset u-pad-14 u-mt-12">
                  <div className="u-fw-900">Customise your drink</div>
                  <div className="muted u-mt-8 u-lh-16">
                    Choose sugar and syrup. (Applies to the whole quantity you add.)
                  </div>

                  <div className="u-mt-12 u-grid-gap-12">
                    <label className="u-grid-gap-8">
                      <span className="muted u-fs-13">Sugar</span>
                      <select
                        className="input"
                        value={String(custom[item.id]?.sugar ?? 0)}
                        onChange={(e) => {
                          const sugar = Number(e.target.value) as 0 | 1 | 2 | 3 | 4;
                          updateCustom(item.id, { ...(custom[item.id] ?? {}), sugar });
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
                              onClick={() => {
                                const current = custom[item.id]?.syrups ?? [];
                                const next = selected
                                  ? current.filter((x) => x !== s.key)
                                  : [...current, s.key as Syrup];
                                updateCustom(item.id, { ...(custom[item.id] ?? {}), syrups: next });
                              }}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </>
  );
}
