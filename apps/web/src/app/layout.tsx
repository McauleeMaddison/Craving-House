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

          <footer className="appFooter">
            <div className="container appFooterInner muted">
              <div className="appFooterRow">
                © {new Date().getFullYear()} {store.name} • {store.addressLine} • {store.postcodeLine}
              </div>
              <nav className="appFooterRow" aria-label="Footer">
                <a
                  className="appFooterLink"
                  href="https://instagram.com/cravinghouseashford2025"
                  target="_blank"
                  rel="noreferrer"
                >
                  {store.instagramHandle}
                </a>
                <span aria-hidden="true">•</span>
                <Link className="appFooterLink" href="/privacy">
                  Privacy
                </Link>
                <span aria-hidden="true">•</span>
                <Link className="appFooterLink" href="/terms">
                  Terms
                </Link>
                <span aria-hidden="true">•</span>
                <Link className="appFooterLink" href="/contact">
                  Contact
                </Link>
                <span aria-hidden="true">•</span>
                <Link className="appFooterLink" href="/staff">
                  Staff
                </Link>
                <span aria-hidden="true">•</span>
                <Link className="appFooterLink" href="/manager">
                  Manager
                </Link>
                <span aria-hidden="true">•</span>
                <Link className="appFooterLink" href="/setup">
                  Setup
                </Link>
              </nav>
            </div>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
