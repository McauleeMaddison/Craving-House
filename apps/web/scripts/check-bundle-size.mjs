import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const CHUNKS_DIR = path.join(ROOT, ".next", "static", "chunks");

const DEFAULT_MAX_TOTAL_KB = 1300;
const DEFAULT_MAX_CHUNK_KB = 420;

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getLimitFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

async function listJsFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listJsFiles(absPath);
      if (!entry.isFile() || !entry.name.endsWith(".js")) return [];
      return [absPath];
    })
  );
  return files.flat();
}

async function main() {
  const maxTotalKb = getLimitFromEnv("BUNDLE_MAX_TOTAL_KB", DEFAULT_MAX_TOTAL_KB);
  const maxChunkKb = getLimitFromEnv("BUNDLE_MAX_CHUNK_KB", DEFAULT_MAX_CHUNK_KB);
  const maxTotalBytes = maxTotalKb * 1024;
  const maxChunkBytes = maxChunkKb * 1024;

  let files;
  try {
    files = await listJsFiles(CHUNKS_DIR);
  } catch (error) {
    console.error(`Unable to read Next.js chunks directory at ${CHUNKS_DIR}`);
    console.error(error);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error("No JavaScript chunks found. Run `npm run build` before bundle checks.");
    process.exit(1);
  }

  const stats = await Promise.all(
    files.map(async (file) => {
      const { size } = await fs.stat(file);
      return { file: path.relative(ROOT, file), size };
    })
  );

  const totalBytes = stats.reduce((sum, item) => sum + item.size, 0);
  const largest = stats.reduce((acc, item) => (item.size > acc.size ? item : acc), stats[0]);
  const topFive = [...stats].sort((a, b) => b.size - a.size).slice(0, 5);

  console.log(`Bundle total: ${formatKb(totalBytes)} (limit ${maxTotalKb} KB)`);
  console.log(`Largest chunk: ${largest.file} (${formatKb(largest.size)}) (limit ${maxChunkKb} KB)`);
  console.log("Top chunks:");
  for (const item of topFive) {
    console.log(`- ${item.file}: ${formatKb(item.size)}`);
  }

  if (totalBytes > maxTotalBytes || largest.size > maxChunkBytes) {
    console.error("Bundle size budget exceeded.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
