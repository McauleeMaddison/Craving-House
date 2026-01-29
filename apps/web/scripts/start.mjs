import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function validateProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const required = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "QR_SECRET"];
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim().length === 0);
  if (missing.length) {
    console.error(`Missing required env var(s): ${missing.join(", ")}`);
    process.exit(1);
  }

  if (process.env.DEV_AUTH_ENABLED === "true" || process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true") {
    console.error("DEV_AUTH_ENABLED must be false in production.");
    process.exit(1);
  }

  const url = String(process.env.NEXTAUTH_URL ?? "").trim();
  if (url && !url.startsWith("https://")) {
    console.error("NEXTAUTH_URL must start with https:// in production.");
    process.exit(1);
  }
  if (url) {
    try {
      const u = new URL(url);
      // Common Render mistake: copying the internal port into NEXTAUTH_URL.
      // Public URLs should not include a port (443 is implied for https).
      if (u.port && u.port !== "443") {
        console.error(`NEXTAUTH_URL must not include a port in production (got :${u.port}).`);
        process.exit(1);
      }
    } catch {
      console.error("NEXTAUTH_URL is not a valid URL.");
      process.exit(1);
    }
  }

  const stripeSecret = String(process.env.STRIPE_SECRET_KEY ?? "").trim();
  const stripeWebhook = String(process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if ((stripeSecret && !stripeWebhook) || (!stripeSecret && stripeWebhook)) {
    console.error("Stripe env mismatch: set both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, or neither.");
    process.exit(1);
  }
}

function envFlagEnabled(key) {
  const raw = process.env[key];
  if (!raw) return false;
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "y" || v === "on";
}

function runPrismaDeploy() {
  if (envFlagEnabled("SKIP_PRISMA_DEPLOY")) {
    console.log("SKIP_PRISMA_DEPLOY enabled; skipping prisma migrate deploy");
    startNext();
    return;
  }

  const deployScript = path.join(__dirname, "..", "prisma", "deploy.cjs");
  const child = spawn(process.execPath, [deployScript], { stdio: "inherit" });
  child.on("exit", (code) => {
    if (code && code !== 0) process.exit(code);
    startNext();
  });
}

function startNext() {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const host = process.env.HOSTNAME ?? "0.0.0.0";

  const localBinCandidates = [
    path.join(__dirname, "..", "node_modules", ".bin", "next"),
    path.join(__dirname, "..", "..", "..", "node_modules", ".bin", "next")
  ];
  const nextBin = localBinCandidates.find((candidate) => existsSync(candidate));

  const child = nextBin
    ? spawn(nextBin, ["start", "-H", host, "-p", String(port)], { stdio: "inherit" })
    : spawn(process.execPath, [path.join(__dirname, "next-bin.mjs"), "start", "-H", host, "-p", String(port)], {
    stdio: "inherit"
  });

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

validateProductionEnv();
runPrismaDeploy();
