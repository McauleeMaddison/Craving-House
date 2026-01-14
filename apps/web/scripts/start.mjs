import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const host = process.env.HOSTNAME ?? "0.0.0.0";

const candidates = [
  path.join(__dirname, "..", "node_modules", ".bin", "next"),
  path.join(__dirname, "..", "..", "..", "node_modules", ".bin", "next")
];
const nextBin = candidates.find((candidate) => existsSync(candidate)) ?? "next";

const child = spawn(nextBin, ["start", "-H", host, "-p", String(port)], {
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
