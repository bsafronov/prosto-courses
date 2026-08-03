import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  truncate,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import {
  MAX_PRECACHE_FILE_BYTES,
  MAX_PRECACHE_TOTAL_BYTES,
  precacheReleaseBudget,
  validatePrecacheRelease,
} from "../scripts/precache-release.mjs";

async function withTemporaryRelease(run) {
  const root = await mkdtemp(path.join(tmpdir(), "precache-release-"));
  try {
    await run(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

async function writeSizedFile(filePath, size) {
  await writeFile(filePath, "");
  await truncate(filePath, size);
}

async function runBuildBudget(root) {
  const hook = precacheReleaseBudget().hooks["astro:build:done"];
  await hook({ dir: pathToFileURL(`${root}${path.sep}`) });
}

test("accepts a complete precache release at both size limits", () => {
  const entries = Array.from({ length: 5 }, (_, index) => ({
    url: `chunk-${index}.bin`,
    size: MAX_PRECACHE_FILE_BYTES,
  }));

  assert.deepEqual(validatePrecacheRelease(entries), {
    fileCount: 5,
    totalBytes: MAX_PRECACHE_TOTAL_BYTES,
  });
});

test("fails the production build for an oversized precache file", async () => {
  await withTemporaryRelease(async (root) => {
    await writeSizedFile(
      path.join(root, "oversized-video.mp4"),
      MAX_PRECACHE_FILE_BYTES + 1,
    );
    await assert.rejects(
      () => runBuildBudget(root),
      /oversized-video\.mp4.*5\.00 MiB.*5 MiB limit/i,
    );
  });
});

test("fails the production build for an oversized complete release", async () => {
  await withTemporaryRelease(async (root) => {
    for (let index = 0; index < 6; index += 1) {
      await writeSizedFile(
        path.join(root, `chunk-${index}.bin`),
        MAX_PRECACHE_FILE_BYTES,
      );
    }
    await assert.rejects(
      () => runBuildBudget(root),
      /complete precache release.*30\.00 MiB.*25 MiB limit/i,
    );
  });
});

test("offline release metadata excludes Course PDFs and print documents", async () => {
  await withTemporaryRelease(async (root) => {
    await writeSizedFile(
      path.join(root, "prosto-courses-representative.pdf"),
      MAX_PRECACHE_TOTAL_BYTES,
    );
    const printDirectory = path.join(
      root,
      "course-pdf-print",
      "representative",
    );
    await mkdir(printDirectory, { recursive: true });
    await writeSizedFile(
      path.join(printDirectory, "index.html"),
      MAX_PRECACHE_FILE_BYTES + 1,
    );
    await writeFile(path.join(root, "index.html"), "Course Catalog");

    await runBuildBudget(root);

    const metadata = JSON.parse(
      await readFile(path.join(root, "offline-release.json"), "utf8"),
    );
    assert.equal(metadata.fileCount, 2);
    assert.ok(metadata.totalBytes < 1024);
  });
});
