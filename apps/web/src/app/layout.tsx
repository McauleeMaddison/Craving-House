import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../styles/globals.css";
import { AppProviders } from "@/app/providers";
import { AppHeader } from "@/components/nav/AppHeader";
import { AppFooter } from "@/components/nav/AppFooter";

export const metadata: Metadata = {
  title: "Craving House",
  description: "Order ahead + loyalty rewards",
  icons: {
    icon: [{ url: "/ch-favicon.jpeg", type: "image/jpeg" }],
    shortcut: ["/ch-favicon.jpeg"],
    apple: [{ url: "/ch-favicon.jpeg", type: "image/jpeg" }]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="poster">
      <body>
        <AppProviders>
          <AppHeader />

          <div className="appMain">{children}</div>

          <AppFooter />
        </AppProviders>
      </body>
    </html>
  );
}
