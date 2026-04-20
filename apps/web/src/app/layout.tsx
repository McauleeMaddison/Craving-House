import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../styles/globals.css";
import { AppProviders } from "@/app/providers";
import { AppChrome } from "@/components/nav/AppChrome";
import { AppFooter } from "@/components/nav/AppFooter";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
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
    icon: [{ url: "/ch-favicon.jpeg", type: "image/jpeg" }],
    shortcut: ["/ch-favicon.jpeg"],
    apple: [{ url: "/ch-favicon.jpeg", type: "image/jpeg" }]
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

            <PwaInstallPrompt />
            <AppFooter />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
