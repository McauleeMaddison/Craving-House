/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Allow camera for in-app QR scanning (staff loyalty scan). Keep other powerful features off by default.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" }
];

const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "chart.googleapis.com",
        pathname: "/chart"
      }
    ]
  },
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
