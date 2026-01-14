"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { CartLine } from "@/components/cart/cart-storage";
import { loadCart, saveCart } from "@/components/cart/cart-storage";

type CartContextValue = {
  lines: CartLine[];
  add: (itemId: string, qty?: number) => void;
  remove: (itemId: string) => void;
  setQty: (itemId: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(loadCart());
  }, []);

  useEffect(() => {
    saveCart(lines);
  }, [lines]);

  const value = useMemo<CartContextValue>(() => {
    return {
      lines,
      add(itemId, qty = 1) {
        setLines((prev) => {
          const next = [...prev];
          const existing = next.find((l) => l.itemId === itemId);
          if (existing) existing.qty += qty;
          else next.push({ itemId, qty });
          return next.filter((l) => l.qty > 0);
        });
      },
      remove(itemId) {
        setLines((prev) => prev.filter((l) => l.itemId !== itemId));
      },
      setQty(itemId, qty) {
        setLines((prev) =>
          prev
            .map((l) => (l.itemId === itemId ? { ...l, qty } : l))
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

