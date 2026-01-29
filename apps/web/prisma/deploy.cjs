const { execFileSync } = require("node:child_process");
const { existsSync, readdirSync } = require("node:fs");
const path = require("node:path");

function hasMigrations() {
  const migrationsDir = path.join(__dirname, "migrations");
  if (!existsSync(migrationsDir)) return false;
  const entries = readdirSync(migrationsDir, { withFileTypes: true });
  return entries.some((entry) => entry.isDirectory());
}

function runPrisma(args) {
  // Avoid `npx prisma` which can be slow and may try to download packages at runtime.
  // Use the locally installed Prisma CLI from dependencies.
  const prismaCli = require.resolve("prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, ...args], { stdio: "inherit" });
}

if (hasMigrations()) {
  runPrisma(["migrate", "deploy"]);
} else {
  console.log("No prisma/migrations found; running `prisma db push` to sync schema.");
  runPrisma(["db", "push"]);
}
