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
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPricePence, setNewPricePence] = useState<number>(290);
  const [newPrepSeconds, setNewPrepSeconds] = useState<number>(60);
  const [newLoyaltyEligible, setNewLoyaltyEligible] = useState<boolean>(true);

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

  async function createProduct() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/manager/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          priceCents: Math.max(0, Math.round(Number(newPricePence))),
          prepSeconds: Math.max(0, Math.round(Number(newPrepSeconds))),
          loyaltyEligible: Boolean(newLoyaltyEligible),
          available: true
        })
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "Create failed");
        return;
      }
      setNewName("");
      setNewDescription("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product? If it has been ordered before, you won’t be able to delete it.")) return;
    setSavingId(id);
    setError("");
    try {
      const res = await fetch(`/api/manager/products/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "Delete failed");
        return;
      }
      await refresh();
    } finally {
      setSavingId("");
    }
  }

  return (
    <>
      <section className="surface u-pad-18">
        <div className="rowWrap u-justify-between">
          <div>
            <h1 className="u-title-26">Menu editor</h1>
            <p className="muted u-mt-10 u-lh-16">
              Toggle availability, prep times, prices, and loyalty eligibility.
            </p>
            {error ? (
              <p className="muted u-mt-10 u-danger">
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

      <section className="surface surfaceInset u-pad-16 u-mt-12">
        <div className="u-fw-900">Add product</div>
        <p className="muted u-mt-8 u-lh-16">
          Create a new menu item. You can adjust price/prep and loyalty eligibility after.
        </p>

        <div className="grid-2 u-mt-12">
          <label className="u-grid-gap-8">
            <span className="muted u-fs-12">Name</span>
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Flat white"
            />
          </label>
          <label className="u-grid-gap-8">
            <span className="muted u-fs-12">Description</span>
            <input
              className="input"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="e.g. Double espresso + steamed milk"
            />
          </label>
        </div>

        <div className="grid-2 u-mt-12">
          <label className="u-grid-gap-8">
            <span className="muted u-fs-12">Price (pence)</span>
            <input
              className="input"
              type="number"
              min={0}
              value={newPricePence}
              onChange={(e) => setNewPricePence(Number(e.target.value))}
            />
          </label>
          <label className="u-grid-gap-8">
            <span className="muted u-fs-12">Prep (seconds)</span>
            <input
              className="input"
              type="number"
              min={0}
              value={newPrepSeconds}
              onChange={(e) => setNewPrepSeconds(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="rowWrap u-mt-12">
          <label className="pill pillButton">
            <input
              type="checkbox"
              checked={newLoyaltyEligible}
              onChange={(e) => setNewLoyaltyEligible(e.target.checked)}
              disabled={creating}
            />
            Earns stamp
          </label>
        </div>

        <button
          className="btn u-mt-12"
          type="button"
          onClick={createProduct}
          disabled={creating || !newName.trim() || !Number.isFinite(newPricePence)}
        >
          {creating ? "Creating…" : "Create product"}
        </button>
      </section>

      <section className="grid-2 u-mt-12">
        {products.map((p) => (
          <article key={p.id} className="surface surfaceFlat u-pad-16">
            <div className="u-flex-between">
              <div>
                <div className="u-fw-900">{p.name}</div>
                <div className="muted u-mt-6 u-lh-15">
                  {p.description || "—"}
                </div>
              </div>
              <div className="u-text-right">
                <div className="u-fw-900">{formatMoneyGBP(p.priceCents)}</div>
                <div className="muted u-mt-6 u-fs-12">
                  Prep: {minutes(p.prepSeconds)}m
                </div>
              </div>
            </div>

            <div className="rowWrap u-mt-12">
              <label className="pill pillButton">
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
              <label className="pill pillButton">
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

            <div className="grid-2 u-mt-12">
              <label className="u-grid-gap-8">
                <span className="muted u-fs-12">
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
              <label className="u-grid-gap-8">
                <span className="muted u-fs-12">
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

            <div className="u-flex-wrap-gap-10 u-mt-12">
              <button
                className="btn u-w-full"
                onClick={() =>
                  patchViaFetch(p.id, { priceCents: p.priceCents, prepSeconds: p.prepSeconds })
                }
                disabled={savingId === p.id}
              >
                {savingId === p.id ? "Saving…" : "Save changes"}
              </button>
              <button
                className="btn btn-danger u-w-full"
                type="button"
                onClick={() => void deleteProduct(p.id)}
                disabled={savingId === p.id}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
