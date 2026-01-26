import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

function run(cmd) {
  return execSync(cmd, { stdio: "pipe" }).toString().trim();
}

function main() {
  if (!existsSync(".git")) return;
  if (!existsSync(".githooks")) return;

  const current = run("git config --get core.hooksPath || true");
  if (current === ".githooks") return;

  try {
    execSync("git config core.hooksPath .githooks", { stdio: "inherit" });
    console.log("Configured git hooks path: .githooks");
  } catch {
    console.warn("Warning: unable to set git hooks path automatically; run `git config core.hooksPath .githooks`.");
  }
}

main();
