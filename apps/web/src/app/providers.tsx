"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

import { CartProvider } from "@/components/cart/CartContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>{children}</CartProvider>
    </SessionProvider>
  );
}
