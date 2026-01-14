"use client";

import type { ReactNode } from "react";

import { CartProvider } from "@/components/cart/CartContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

