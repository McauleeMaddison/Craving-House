import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../styles/globals.css";
import { AppProviders } from "@/app/providers";
import { AppChrome } from "@/components/nav/AppChrome";
import { AppFooter } from "@/components/nav/AppFooter";
import { getConfiguredPublicUrl } from "@/lib/public-url";

const themeBootstrapScript = `(() => {
  try {
    const stored = window.localStorage.getItem("ch.theme");
    if (stored === "dark" || stored === "poster") {
      document.documentElement.dataset.theme = stored;
    }
  } catch {}
})();`;

export const metadata: Metadata = {
  metadataBase: getConfiguredPublicUrl() ?? undefined,
  title: "Craving House",
  description: "Order ahead + loyalty rewards",
  icons: {
    icon: [{ url: "/icon.svg?v=4", type: "image/svg+xml" }],
    shortcut: ["/icon.svg?v=4"],
    apple: [{ url: "/icon.svg?v=4", type: "image/svg+xml" }]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="poster">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <a className="skipLink" href="#main-content">
          Skip to content
        </a>
        <AppProviders>
          <div className="app-shell">
            <AppChrome />

            <div id="main-content" className="appMain" tabIndex={-1}>
              {children}
            </div>

            <AppFooter />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
