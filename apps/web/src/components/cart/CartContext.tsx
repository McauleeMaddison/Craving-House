"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { CartLine } from "@/components/cart/cart-storage";
import { loadCart, saveCart } from "@/components/cart/cart-storage";
import type { DrinkCustomizations } from "@/lib/drink-customizations";
import { customizationsKey, normalizeCustomizations } from "@/lib/drink-customizations";

type CartContextValue = {
  lines: CartLine[];
  add: (itemId: string, qty?: number, customizations?: DrinkCustomizations | null) => void;
  remove: (lineId: string) => void;
  setQty: (lineId: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => loadCart());

  useEffect(() => {
    saveCart(lines);
  }, [lines]);

  const value = useMemo<CartContextValue>(() => {
    return {
      lines,
      add(itemId, qty = 1, customizations) {
        setLines((prev) => {
          const next = [...prev];
          const cleaned = normalizeCustomizations(customizations);
          const id = `${itemId}:${customizationsKey(cleaned)}`;
          const existing = next.find((l) => l.id === id);
          if (existing) existing.qty += qty;
          else next.push({ id, itemId, qty, customizations: cleaned ?? undefined });
          return next.filter((l) => l.qty > 0);
        });
      },
      remove(lineId) {
        setLines((prev) => prev.filter((l) => l.id !== lineId));
      },
      setQty(lineId, qty) {
        setLines((prev) =>
          prev
            .map((l) => (l.id === lineId ? { ...l, qty } : l))
            .filter((l) => l.qty > 0)
        );
      },
      clear() {
        setLines([]);
      }
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
