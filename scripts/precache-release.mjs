import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIB = 1024 * 1024;

export const MAX_PRECACHE_TOTAL_BYTES = 25 * MIB;
export const MAX_PRECACHE_FILE_BYTES = 5 * MIB;

const formatMib = (bytes) => `${(bytes / MIB).toFixed(2)} MiB`;

export function validatePrecacheRelease(
  entries,
  {
    maxFileBytes = MAX_PRECACHE_FILE_BYTES,
    maxTotalBytes = MAX_PRECACHE_TOTAL_BYTES,
  } = {},
) {
  const oversized = entries.find((entry) => entry.size > maxFileBytes);
  if (oversized) {
    throw new Error(
      `Precache file "${oversized.url}" is ${formatMib(oversized.size)}, ` +
        `above the ${formatMib(maxFileBytes).replace(".00", "")} limit. ` +
        "Optimize or remove this platform-owned resource before publication.",
    );
  }

  const totalBytes = entries.reduce((total, entry) => total + entry.size, 0);
  if (totalBytes > maxTotalBytes) {
    throw new Error(
      `Complete precache release is ${formatMib(totalBytes)}, above the ` +
        `${formatMib(maxTotalBytes).replace(".00", "")} limit. ` +
        "Optimize the Course Catalog or deliberately revisit ADR-0007.",
    );
  }

  return { fileCount: entries.length, totalBytes };
}

async function collectFiles(root, directory = root) {
  const entries = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, item.name);
    if (item.isDirectory()) {
      entries.push(...(await collectFiles(root, absolutePath)));
      continue;
    }
    if (!item.isFile()) continue;
    const file = await stat(absolutePath);
    entries.push({
      url: path.relative(root, absolutePath).split(path.sep).join("/"),
      size: file.size,
    });
  }
  return entries;
}

function releaseMetadata(entries) {
  const fileCount = entries.length + 1;
  const filesTotal = entries.reduce((total, entry) => total + entry.size, 0);
  let totalBytes = filesTotal;
  let source = "";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    source = `${JSON.stringify({ fileCount, totalBytes })}\n`;
    const measuredTotal = filesTotal + Buffer.byteLength(source);
    if (measuredTotal === totalBytes) break;
    totalBytes = measuredTotal;
  }

  return { source, totalBytes };
}

export function precacheReleaseBudget() {
  return {
    name: "prosto-courses-precache-release-budget",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const root = fileURLToPath(dir);
        const entries = await collectFiles(root);
        const metadata = releaseMetadata(entries);
        const metadataUrl = "offline-release.json";
        await writeFile(path.join(root, metadataUrl), metadata.source);
        entries.push({
          url: metadataUrl,
          size: Buffer.byteLength(metadata.source),
        });
        const release = validatePrecacheRelease(entries);
        console.info(
          `Offline Availability release: ${formatMib(release.totalBytes)} ` +
            `across ${release.fileCount} files.`,
        );
      },
    },
  };
}
