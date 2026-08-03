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
import { isCoursePdfOfflineExcluded } from "../../scripts/course-pdf-artifacts.mjs";
import { completeContentRootAuthoringArtifacts } from "./complete-authoring-artifacts.mjs";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const temporaryRoot = await mkdtemp(
  path.join(tmpdir(), "prosto-courses-browser-"),
);
const firstContentRoot = path.join(temporaryRoot, "courses-v1");
const secondContentRoot = path.join(temporaryRoot, "courses-v2");
const firstOutputRoot = path.join(temporaryRoot, "dist-v1");
const secondOutputRoot = path.join(temporaryRoot, "dist-v2");
const rootOutputRoot = path.join(temporaryRoot, "dist-root");
const firstCacheRoot = path.join(temporaryRoot, "cache-v1");
const secondCacheRoot = path.join(temporaryRoot, "cache-v2");
const rootCacheRoot = path.join(temporaryRoot, "cache-root");

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

const runBuild = ({ basePath, cacheRoot, contentRoot, outputRoot }) =>
  new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["build"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        ASTRO_CACHE_DIR: cacheRoot,
        ASTRO_OUT_DIR: outputRoot,
        CONTENT_VALIDATION_DATE: "2026-08-30",
        COURSE_CONTENT_ROOT: contentRoot,
        ...(basePath ? { SITE_BASE_PATH: basePath } : {}),
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

await runBuild({
  cacheRoot: firstCacheRoot,
  contentRoot: firstContentRoot,
  outputRoot: firstOutputRoot,
});
await runBuild({
  cacheRoot: secondCacheRoot,
  contentRoot: secondContentRoot,
  outputRoot: secondOutputRoot,
});
await runBuild({
  basePath: "/",
  cacheRoot: rootCacheRoot,
  contentRoot: firstContentRoot,
  outputRoot: rootOutputRoot,
});

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
  [".pdf", "application/pdf"],
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
      /^workbox-[\w-]+\.js$/.test(relativePath) ||
      isCoursePdfOfflineExcluded(relativePath)
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

const collectExpectedLearnerRoutes = async (contentRoot, scope) => {
  const routes = [scope];
  for (const course of await readdir(contentRoot, { withFileTypes: true })) {
    if (!course.isDirectory()) continue;
    const coursePath = path.join(contentRoot, course.name);
    routes.push(
      `${scope}courses/${course.name}/`,
      `${scope}courses/${course.name}/capstone/`,
    );

    const modulesPath = path.join(coursePath, "modules");
    for (const module of await readdir(modulesPath, { withFileTypes: true })) {
      if (!module.isDirectory()) continue;
      routes.push(
        `${scope}courses/${course.name}/modules/${module.name}/`,
        `${scope}courses/${course.name}/modules/${module.name}/checkpoint/`,
      );

      const lessonsPath = path.join(modulesPath, module.name, "lessons");
      for (const lesson of await readdir(lessonsPath, {
        withFileTypes: true,
      })) {
        if (!lesson.isFile() || path.extname(lesson.name) !== ".mdx") continue;
        routes.push(
          `${scope}courses/${course.name}/lessons/${path.basename(
            lesson.name,
            ".mdx",
          )}/`,
        );
      }
    }
  }
  return routes.sort();
};

const releaseInventories = new Map([
  [firstOutputRoot, await collectReleaseInventory(firstOutputRoot)],
  [secondOutputRoot, await collectReleaseInventory(secondOutputRoot)],
]);
const rootLearnerRoutes = await collectExpectedLearnerRoutes(
  firstContentRoot,
  "/",
);

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

const serveStaticFile = async (
  request,
  response,
  requestPath,
  {
    injectPrecacheFaults = true,
    outputRoot = activeOutputRoot,
    prefix = basePrefix,
    scope = baseScope,
  } = {},
) => {
  if (requestPath === prefix) {
    response.writeHead(308, { Location: scope });
    response.end();
    return;
  }

  if (!requestPath.startsWith(scope)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  if (
    injectPrecacheFaults &&
    holdRequiredPrecacheRequest &&
    requestPath === requiredPrecachePath
  ) {
    await new Promise((resolve) => {
      releaseHeldPrecacheRequests.push(resolve);
    });
  }

  if (
    injectPrecacheFaults &&
    failRequiredPrecacheRequest &&
    requestPath === requiredPrecachePath
  ) {
    failedPrecacheRequestCount += 1;
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Injected precache failure");
    return;
  }

  const relativePath = requestPath.slice(scope.length);
  let filePath = path.resolve(outputRoot, relativePath || "index.html");

  if (
    filePath !== outputRoot &&
    !filePath.startsWith(`${outputRoot}${path.sep}`)
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

    if (requestPath === `${scope}sw.js`) {
      headers["Service-Worker-Allowed"] = scope;
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

const rootServer = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/__test__/routes") {
      sendJson(response, 200, { routes: rootLearnerRoutes });
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

    await serveStaticFile(request, response, requestPath, {
      injectPrecacheFaults: false,
      outputRoot: rootOutputRoot,
      prefix: "",
      scope: "/",
    });
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
await new Promise((resolve, reject) => {
  rootServer.once("error", reject);
  rootServer.listen(4323, "127.0.0.1", resolve);
});

console.log(`Production fixture server listening at http://127.0.0.1:4322${baseScope}`);
console.log("Root production fixture server listening at http://127.0.0.1:4323/");

let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => rootServer.close(resolve));
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
