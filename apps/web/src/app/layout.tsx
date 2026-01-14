import type { ReactNode } from "react";
import Link from "next/link";

import "./globals.css";
import { AppProviders } from "@/app/providers";
import { store } from "@/lib/store";
import { AppHeader } from "@/components/nav/AppHeader";

export const metadata = {
  title: "Craving House",
  description: "Order ahead + loyalty rewards"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="poster">
      <body>
        <AppProviders>
          <AppHeader />

          {children}

          <footer>
            <div className="container muted">
              <span>
                © {new Date().getFullYear()} {store.name} • {store.addressLine} • {store.postcodeLine}
              </span>
              <span>
                <a> href="https://instagram.com/cravinghouseashford2025" target="_blank" rel="noreferrer"
                  {store.instagramHandle}
                </a>
                <span aria-hidden="true">•</span>
                <Link href="/privacy">Privacy</Link>
                <span aria-hidden="true">•</span>
                <Link href="/terms">Terms</Link>
                <span aria-hidden="true">•</span>
                <Link href="/contact">Contact</Link>
                <span aria-hidden="true">•</span>
                <Link href="/staff">Staff</Link>
                <span aria-hidden="true">•</span>
                <Link href="/manager">Manager</Link>
                <span aria-hidden="true">•</span>
                <Link href="/setup">Setup</Link>
              </span>
            </div>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
