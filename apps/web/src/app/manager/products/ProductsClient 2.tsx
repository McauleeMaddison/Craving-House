"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetJson } from "@/lib/api";
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

function minutes(seconds: number) {
  return Math.round(Math.max(0, seconds) / 60);
}

export function ProductsClient() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [error, setError] = useState<string>("");
  const [savingId, setSavingId] = useState<string>("");

  async function refresh() {
    setError("");
    const res = await apiGetJson<{ products: ProductDto[] }>("/api/manager/products");
    if (!res.ok) {
      setError(res.status === 401 ? "Sign in as manager." : res.error);
      setProducts([]);
      return;
    }
    setProducts(res.data.products);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const totals = useMemo(() => {
    const count = products.length;
    const active = products.filter((p) => p.available).length;
    const eligible = products.filter((p) => p.loyaltyEligible).length;
    return { count, active, eligible };
  }, [products]);

  async function patchViaFetch(id: string, body: any) {
    setSavingId(id);
    setError("");
    try {
      const res = await fetch(`/api/manager/products/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "Save failed");
        return;
      }
      await refresh();
    } finally {
      setSavingId("");
    }
  }

  return (
    <>
      <section className="surface" style={{ padding: 18 }}>
        <div className="rowWrap" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 26 }}>Menu editor</h1>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
              Toggle availability, prep times, prices, and loyalty eligibility.
            </p>
            {error ? (
              <p className="muted" style={{ marginTop: 10, color: "var(--danger)" }}>
                {error}
              </p>
            ) : null}
          </div>
          <div className="rowWrap">
            <span className="pill">Items: {totals.count}</span>
            <span className="pill">Available: {totals.active}</span>
            <span className="pill">Stamp-eligible: {totals.eligible}</span>
            <button className="btn btn-secondary" onClick={refresh} type="button">
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid-2" style={{ marginTop: 12 }}>
        {products.map((p) => (
          <article key={p.id} className="surface surfaceFlat" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900 }}>{p.name}</div>
                <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
                  {p.description || "—"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900 }}>{formatMoneyGBP(p.priceCents)}</div>
                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  Prep: {minutes(p.prepSeconds)}m
                </div>
              </div>
            </div>

            <div className="rowWrap" style={{ marginTop: 12 }}>
              <label className="pill" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={p.available}
                  onChange={(e) =>
                    patchViaFetch(p.id, { available: e.target.checked })
                  }
                  disabled={savingId === p.id}
                />
                Available
              </label>
              <label className="pill" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={p.loyaltyEligible}
                  onChange={(e) =>
                    patchViaFetch(p.id, { loyaltyEligible: e.target.checked })
                  }
                  disabled={savingId === p.id}
                />
                Earns stamp
              </label>
            </div>

            <div className="grid-2" style={{ marginTop: 12 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  Price (pence)
                </span>
                <input
                  className="input"
                  type="number"
                  value={p.priceCents}
                  onChange={(e) =>
                    setProducts((prev) =>
                      prev.map((x) =>
                        x.id === p.id ? { ...x, priceCents: Number(e.target.value) } : x
                      )
                    )
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  Prep (seconds)
                </span>
                <input
                  className="input"
                  type="number"
                  value={p.prepSeconds}
                  onChange={(e) =>
                    setProducts((prev) =>
                      prev.map((x) =>
                        x.id === p.id ? { ...x, prepSeconds: Number(e.target.value) } : x
                      )
                    )
                  }
                />
              </label>
            </div>

            <button
              className="btn"
              style={{ marginTop: 12, width: "100%" }}
              onClick={() =>
                patchViaFetch(p.id, { priceCents: p.priceCents, prepSeconds: p.prepSeconds })
              }
              disabled={savingId === p.id}
            >
              {savingId === p.id ? "Saving…" : "Save changes"}
            </button>
          </article>
        ))}
      </section>
    </>
  );
}
