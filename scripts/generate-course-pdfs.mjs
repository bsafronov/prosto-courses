import { createServer } from "node:http";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { COURSE_PDF_PRINT_DIRECTORY } from "./course-pdf-artifacts.mjs";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

async function serveOutputFile(root, scope, request, response) {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  let requestPath;
  try {
    requestPath = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  if (!requestPath.startsWith(scope)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const relativePath = requestPath.slice(scope.length);
  let filePath = path.resolve(root, relativePath || "index.html");
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await stat(filePath);
    if (file.isDirectory()) filePath = path.join(filePath, "index.html");
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type":
        contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
    });
    response.end(body);
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
    response.writeHead(404);
    response.end("Not found");
  }
}

async function startOutputServer(root, scope) {
  const server = createServer((request, response) => {
    void serveOutputFile(root, scope, request, response).catch((error) => {
      console.error(error);
      response.writeHead(500);
      response.end("Internal server error");
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Course PDF output server has no TCP address");
  }
  return { origin: `http://127.0.0.1:${address.port}`, server };
}

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

async function preparePrintDocument(page) {
  await page.locator("details").evaluateAll((details) => {
    details.forEach((detail) => {
      detail.open = true;
    });
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete),
  );
  await page.waitForFunction(
    () => !document.querySelector('[data-mermaid-container][aria-busy="true"]'),
    undefined,
    { timeout: 15_000 },
  );
  return page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const block = styles.getPropertyValue("--print-page-margin-block").trim();
    const inline = styles.getPropertyValue("--print-page-margin-inline").trim();
    if (!block || !inline) throw new Error("Course PDF page margins are missing");
    return { top: block, right: inline, bottom: block, left: inline };
  });
}

async function generateCoursePdfs(root, scope, logger) {
  const printRoot = path.join(root, COURSE_PDF_PRINT_DIRECTORY);
  const documents = (await readdir(printRoot, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory(),
  );
  const { origin, server } = await startOutputServer(root, scope);
  let browser;

  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage();
    for (const document of documents) {
      const response = await page.goto(
        `${origin}${scope}${COURSE_PDF_PRINT_DIRECTORY}/${encodeURIComponent(document.name)}/`,
        { waitUntil: "networkidle" },
      );
      if (!response?.ok()) {
        throw new Error(
          `Could not load print document ${document.name}: ${response?.status() ?? "no response"}`,
        );
      }
      const margin = await preparePrintDocument(page);
      const filename = await page
        .locator('meta[name="course-pdf-filename"]')
        .getAttribute("content");
      if (!filename) {
        throw new Error(`Print document ${document.name} has no PDF filename`);
      }
      await page.pdf({
        format: "A4",
        margin,
        outline: true,
        path: path.join(root, filename),
        printBackground: true,
        tagged: true,
      });
    }
    logger.info(`Generated ${documents.length} Course PDF artifacts.`);
  } finally {
    await browser?.close();
    await closeServer(server);
    await rm(printRoot, { force: true, recursive: true });
  }
}

export function coursePdfBuild({ siteBasePath }) {
  const scope = siteBasePath === "/" ? "/" : `${siteBasePath}/`;
  return {
    name: "prosto-courses-course-pdf-build",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        await generateCoursePdfs(path.resolve(fileURLToPath(dir)), scope, logger);
      },
    },
  };
}
