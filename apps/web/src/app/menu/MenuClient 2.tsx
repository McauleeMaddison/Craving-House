"use client";

import { useMemo, useState } from "react";

import { useCart } from "@/components/cart/CartContext";
import { apiGetJson } from "@/lib/api";
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

export function MenuClient() {
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductDto[]>([]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => p.available);
    if (!q) return list;
    return list.filter((x) => {
      return (
        x.name.toLowerCase().includes(q) ||
        x.description.toLowerCase().includes(q)
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
              <button className="btn" onClick={() => cart.add(item.id, 1)}>
                Add to cart
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
