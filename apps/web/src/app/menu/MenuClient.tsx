"use client";

import { useEffect, useMemo, useState } from "react";

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
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductDto[]>([]);
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
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <div className="surface" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>Menu</h1>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Manager-controlled prep times and loyalty eligibility. (Sample data for now.)
            </p>
          </div>
          <div style={{ minWidth: 260, width: "min(380px, 100%)" }}>
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

      <section className="grid-2" style={{ marginTop: 12 }}>
        {items.map((item) => (
          <article key={item.id} className="surface" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800 }}>{item.name}</div>
                <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
                  {item.description}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800 }}>{formatMoneyGBP(item.priceCents)}</div>
                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  Prep: {Math.round(item.prepSeconds / 60)}m
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              <div className="pill">
                {item.loyaltyEligible ? "Earns stamp" : "No stamp"}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
              <div className="surface" style={{ padding: 14, marginTop: 12, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
                <div style={{ fontWeight: 900 }}>Customise your drink</div>
                <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
                  Choose sugar and syrup. (Applies to the whole quantity you add.)
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  <label style={{ display: "grid", gap: 8 }}>
                    <span className="muted" style={{ fontSize: 13 }}>Sugar</span>
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

                  <div style={{ display: "grid", gap: 8 }}>
                    <span className="muted" style={{ fontSize: 13 }}>Syrups</span>
                    <div className="rowWrap">
                      {SYRUP_OPTIONS.map((s) => {
                        const selected = Boolean(custom[item.id]?.syrups?.includes(s.key));
                        return (
                          <button
                            key={s.key}
                            type="button"
                            className={`btn btn-secondary ${selected ? "btnActive" : ""}`}
                            onClick={() => {
                              const current = custom[item.id]?.syrups ?? [];
                              const next = selected
                                ? current.filter((x) => x !== s.key)
                                : [...current, s.key as Syrup];
                              updateCustom(item.id, { ...(custom[item.id] ?? {}), syrups: next });
                            }}
                            style={{ minHeight: 38, padding: "8px 10px" }}
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
    </>
  );
}
