import { cp, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const temporaryRoot = await mkdtemp(
  path.join(tmpdir(), "prosto-courses-browser-"),
);
const contentRoot = path.join(temporaryRoot, "courses");
const outDir = path.join(temporaryRoot, "dist");
const cacheDir = path.join(temporaryRoot, "cache");

async function copyCourses(sourceRoot) {
  for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    await cp(path.join(sourceRoot, entry.name), path.join(contentRoot, entry.name), {
      recursive: true,
    });
  }
}

async function buildFixtureSite(environment) {
  const child = spawn("pnpm", ["build"], {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  if (exitCode !== 0) process.exit(exitCode ?? 1);
}

await mkdir(contentRoot, { recursive: true });
await copyCourses(path.join(projectRoot, "src/content/courses"));
await copyCourses(path.join(projectRoot, "tests/fixtures/valid-course"));

const environment = {
  ...process.env,
  ASTRO_OUT_DIR: outDir,
  ASTRO_CACHE_DIR: cacheDir,
  COURSE_CONTENT_ROOT: contentRoot,
};

await buildFixtureSite(environment);

const preview = spawn(
  "pnpm",
  ["preview", "--host", "127.0.0.1", "--port", "4322"],
  { cwd: projectRoot, env: environment, stdio: "inherit" },
);

async function shutDown(signal) {
  preview.kill(signal);
  await rm(temporaryRoot, { recursive: true, force: true });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await shutDown(signal);
    process.exit(0);
  });
}

preview.once("error", async (error) => {
  await rm(temporaryRoot, { recursive: true, force: true });
  throw error;
});

preview.once("exit", async (exitCode) => {
  await rm(temporaryRoot, { recursive: true, force: true });
  process.exit(exitCode ?? 0);
});
