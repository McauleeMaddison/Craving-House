"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

import { CartProvider } from "@/components/cart/CartContext";
import { PwaRuntimeClient } from "@/components/pwa/PwaRuntimeClient";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <PwaRuntimeClient />
        {children}
      </CartProvider>
    </SessionProvider>
  );
}
