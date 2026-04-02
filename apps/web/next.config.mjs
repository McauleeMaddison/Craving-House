/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildContentSecurityPolicy() {
  const isDev = process.env.NODE_ENV !== "production";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://api.stripe.com${isDev ? " ws: wss:" : ""}`,
    "frame-src 'self' https://checkout.stripe.com https://accounts.google.com",
    "form-action 'self' https://accounts.google.com https://checkout.stripe.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'"
  ];

  if (!isDev) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Allow camera for in-app QR scanning (staff loyalty scan). Keep other powerful features off by default.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy() }
];

const nextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: path.resolve(__dirname, "..", "..")
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Never cache auth endpoints (session/csrf/callbacks), especially behind CDNs.
        source: "/api/auth/(.*)",
        headers: [...securityHeaders, { key: "Cache-Control", value: "no-store" }]
      },
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
