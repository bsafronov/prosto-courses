import { createServer } from "node:http";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { siteBasePath } from "../../site.config.mjs";
import { completeContentRootAuthoringArtifacts } from "./complete-authoring-artifacts.mjs";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const temporaryRoot = await mkdtemp(
  path.join(tmpdir(), "prosto-courses-browser-"),
);
const firstContentRoot = path.join(temporaryRoot, "courses-v1");
const secondContentRoot = path.join(temporaryRoot, "courses-v2");
const firstOutputRoot = path.join(temporaryRoot, "dist-v1");
const secondOutputRoot = path.join(temporaryRoot, "dist-v2");
const firstCacheRoot = path.join(temporaryRoot, "cache-v1");
const secondCacheRoot = path.join(temporaryRoot, "cache-v2");

const copyCourseDirectories = async (sourceRoot, targetRoot) => {
  await mkdir(targetRoot, { recursive: true });

  for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    await cp(path.join(sourceRoot, entry.name), path.join(targetRoot, entry.name), {
      recursive: true,
    });
  }
};

await copyCourseDirectories(
  path.join(projectRoot, "src", "content", "courses"),
  firstContentRoot,
);
await copyCourseDirectories(
  path.join(projectRoot, "tests", "fixtures", "valid-course"),
  firstContentRoot,
);
await copyCourseDirectories(
  path.join(projectRoot, "tests", "fixtures", "browser"),
  firstContentRoot,
);
await completeContentRootAuthoringArtifacts(firstContentRoot);
await cp(firstContentRoot, secondContentRoot, { recursive: true });

const changedLessonPath = path.join(
  secondContentRoot,
  "markdown",
  "modules",
  "struktura",
  "lessons",
  "formatting.mdx",
);
const firstLessonSource = await readFile(changedLessonPath, "utf8");
const secondLessonSource = firstLessonSource
  .replace(
    "title: Заголовки, выделение и списки",
    "title: Заголовки, выделение и списки — выпуск 2",
  )
  .replace("revision: 3", "revision: 4");

if (secondLessonSource === firstLessonSource) {
  throw new Error(`Could not create the second release from ${changedLessonPath}`);
}

await writeFile(changedLessonPath, secondLessonSource);

const runBuild = (contentRoot, outputRoot, cacheRoot) =>
  new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["build"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        ASTRO_CACHE_DIR: cacheRoot,
        ASTRO_OUT_DIR: outputRoot,
        CONTENT_VALIDATION_DATE: "2026-10-23",
        COURSE_CONTENT_ROOT: contentRoot,
      },
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Production build failed with ${
            signal ? `signal ${signal}` : `exit code ${code}`
          }`,
        ),
      );
    });
  });

await runBuild(firstContentRoot, firstOutputRoot, firstCacheRoot);
await runBuild(secondContentRoot, secondOutputRoot, secondCacheRoot);

const basePrefix = siteBasePath === "/" ? "" : siteBasePath;
const baseScope = `${basePrefix}/`;
const requiredPrecachePath =
  `${baseScope}courses/markdown/lessons/formatting/`;
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const collectReleaseInventory = async (root, directory = root) => {
  const releaseUrls = [];
  const routes = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectReleaseInventory(root, absolutePath);
      releaseUrls.push(...nested.releaseUrls);
      routes.push(...nested.routes);
      continue;
    }
    if (!entry.isFile()) continue;

    const relativePath = path
      .relative(root, absolutePath)
      .split(path.sep)
      .join("/");
    if (
      relativePath === "sw.js" ||
      /^workbox-[\w-]+\.js$/.test(relativePath)
    ) {
      continue;
    }

    const releaseUrl =
      relativePath === "index.html"
        ? baseScope
        : relativePath.endsWith("/index.html")
          ? `${baseScope}${relativePath.slice(0, -"index.html".length)}`
          : `${baseScope}${relativePath}`;
    releaseUrls.push(releaseUrl);
    if (relativePath.endsWith("index.html")) routes.push(releaseUrl);
  }

  return {
    releaseUrls: releaseUrls.sort(),
    routes: routes.sort(),
  };
};

const releaseInventories = new Map([
  [firstOutputRoot, await collectReleaseInventory(firstOutputRoot)],
  [secondOutputRoot, await collectReleaseInventory(secondOutputRoot)],
]);

let activeOutputRoot = firstOutputRoot;
let failRequiredPrecacheRequest = false;
let failedPrecacheRequestCount = 0;
let holdRequiredPrecacheRequest = false;
let releaseHeldPrecacheRequests = [];

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
};

const serveStaticFile = async (request, response, requestPath) => {
  if (requestPath === basePrefix) {
    response.writeHead(308, { Location: baseScope });
    response.end();
    return;
  }

  if (!requestPath.startsWith(baseScope)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  if (
    holdRequiredPrecacheRequest &&
    requestPath === requiredPrecachePath
  ) {
    await new Promise((resolve) => {
      releaseHeldPrecacheRequests.push(resolve);
    });
  }

  if (
    failRequiredPrecacheRequest &&
    requestPath === requiredPrecachePath
  ) {
    failedPrecacheRequestCount += 1;
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Injected precache failure");
    return;
  }

  const relativePath = requestPath.slice(baseScope.length);
  let filePath = path.resolve(activeOutputRoot, relativePath || "index.html");

  if (
    filePath !== activeOutputRoot &&
    !filePath.startsWith(`${activeOutputRoot}${path.sep}`)
  ) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    const body = await readFile(filePath);
    const headers = {
      "Cache-Control": "no-cache",
      "Content-Type":
        contentTypes.get(path.extname(filePath)) ??
        "application/octet-stream",
    };

    if (requestPath === `${baseScope}sw.js`) {
      headers["Service-Worker-Allowed"] = baseScope;
    }

    response.writeHead(200, headers);
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") {
      throw error;
    }

    response.writeHead(404);
    response.end("Not found");
  }
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (
      request.method === "POST" &&
      (url.pathname === "/__test__/release/1" ||
        url.pathname === "/__test__/release/2")
    ) {
      const release = url.pathname.endsWith("/2") ? 2 : 1;
      activeOutputRoot =
        release === 2 ? secondOutputRoot : firstOutputRoot;
      failRequiredPrecacheRequest = url.searchParams.get("fail") === "1";
      holdRequiredPrecacheRequest = url.searchParams.get("hold") === "1";
      if (!holdRequiredPrecacheRequest) {
        for (const releaseRequest of releaseHeldPrecacheRequests) {
          releaseRequest();
        }
        releaseHeldPrecacheRequests = [];
      }
      failedPrecacheRequestCount = 0;
      sendJson(response, 200, {
        failRequiredPrecacheRequest,
        failedPrecacheRequestCount,
        holdRequiredPrecacheRequest,
        release,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/__test__/state") {
      sendJson(response, 200, {
        failRequiredPrecacheRequest,
        failedPrecacheRequestCount,
        holdRequiredPrecacheRequest,
        release: activeOutputRoot === secondOutputRoot ? 2 : 1,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/__test__/release") {
      sendJson(response, 200, releaseInventories.get(activeOutputRoot));
      return;
    }

    let requestPath;
    try {
      requestPath = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400);
      response.end("Bad request");
      return;
    }

    await serveStaticFile(request, response, requestPath);
  } catch (error) {
    console.error(error);
    response.writeHead(500);
    response.end("Internal server error");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(4322, "127.0.0.1", resolve);
});

console.log(`Production fixture server listening at http://127.0.0.1:4322${baseScope}`);

let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await new Promise((resolve) => server.close(resolve));
  await rm(temporaryRoot, { force: true, recursive: true });
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await shutdown();
    process.exit(0);
  });
}

process.once("exit", () => {
  void rm(temporaryRoot, { force: true, recursive: true });
});
