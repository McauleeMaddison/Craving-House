import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function resolveNextBin() {
  const candidates = [
    path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next"),
    path.join(__dirname, "..", "..", "..", "node_modules", "next", "dist", "bin", "next")
  ];
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;

  try {
    return require.resolve("next/dist/bin/next", { paths: [path.join(__dirname, ".."), path.join(__dirname, "..", "..", "..")] });
  } catch {
    return null;
  }
}

const nextBin = resolveNextBin();
if (!nextBin) {
  console.error("Could not resolve Next.js binary.");
  process.exit(1);
}

const args = process.argv.slice(2);
const child = spawn(process.execPath, [nextBin, ...args], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));

