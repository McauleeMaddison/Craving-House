/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
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
  reactStrictMode: true
};

export default nextConfig;
