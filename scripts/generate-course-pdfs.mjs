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
const nonblankSvgSelector =
  "svg path, svg rect, svg circle, svg line, svg polyline, svg polygon, svg text";

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

async function preparePrintDocument(page, courseSlug) {
  await page.evaluate(() => {
    const appendix = document.querySelector(
      "[data-course-pdf-knowledge-check-appendix]",
    );
    const answerList = appendix?.querySelector(
      "[data-course-pdf-knowledge-check-answers]",
    );
    const checks = [
      ...document.querySelectorAll("[data-course-pdf-knowledge-check]"),
    ];
    if (!(appendix instanceof HTMLElement) || !answerList || checks.length === 0) {
      return;
    }

    const setKnowledgeCheckNumber = (root, number) => {
      root
        .querySelectorAll("[data-course-pdf-knowledge-check-number]")
        .forEach((label) => {
          label.textContent = String(number);
        });
    };

    for (const [index, check] of checks.entries()) {
      const number = index + 1;
      const activityId = `knowledge-check-${number}`;
      const answerId = `knowledge-check-answer-${number}`;
      check.id = activityId;
      setKnowledgeCheckNumber(check, number);

      const answerLink = check.querySelector(
        "[data-course-pdf-knowledge-check-link]",
      );
      if (answerLink instanceof HTMLAnchorElement) {
        answerLink.href = `#${answerId}`;
      }

      const template = check.querySelector(
        "template[data-course-pdf-knowledge-check-answer]",
      );
      if (!(template instanceof HTMLTemplateElement)) continue;
      const answer = template.content.cloneNode(true);
      if (!(answer instanceof DocumentFragment)) continue;
      const entry = answer.querySelector(
        "[data-course-pdf-knowledge-check-answer-entry]",
      );
      if (!(entry instanceof HTMLElement)) continue;
      entry.id = answerId;
      setKnowledgeCheckNumber(entry, number);
      const returnLink = entry.querySelector(
        "[data-course-pdf-knowledge-check-return-link]",
      );
      if (returnLink instanceof HTMLAnchorElement) {
        returnLink.href = `#${activityId}`;
      }
      answerList.append(answer);
      template.remove();
    }

    appendix.hidden = false;
  });
  await page.locator("details").evaluateAll((details) => {
    details.forEach((detail) => {
      detail.open = true;
    });
  });
  const failedFont = await page.evaluate(async () => {
    const fonts = [...document.fonts];
    for (const font of fonts) {
      try {
        await font.load();
      } catch {
        return font.family;
      }
    }
    await document.fonts.ready;
    return fonts.find((font) => font.status !== "loaded")?.family ?? null;
  });
  if (failedFont) {
    throw new Error(
      `Course "${courseSlug}" local font failed to load: ${failedFont}`,
    );
  }
  try {
    await page.waitForFunction(
      () => [...document.images].every((image) => image.complete),
      undefined,
      { timeout: 15_000 },
    );
  } catch (error) {
    throw new Error(
      `Course "${courseSlug}" authored images did not finish loading within 15 seconds`,
      { cause: error },
    );
  }
  const failedImage = await page.evaluate(async () => {
    for (const image of document.images) {
      try {
        await image.decode();
      } catch {
        return image.getAttribute("src") ?? "image without a source";
      }
      if (image.naturalWidth === 0) {
        return image.getAttribute("src") ?? "image without a source";
      }
    }
    return null;
  });
  if (failedImage) {
    throw new Error(
      `Course "${courseSlug}" authored image failed to load: ${failedImage}`,
    );
  }
  try {
    await page.waitForFunction(
      () => !document.querySelector('[data-mermaid-container][aria-busy="true"]'),
      undefined,
      { timeout: 15_000 },
    );
  } catch (error) {
    throw new Error(
      `Course "${courseSlug}" Diagram did not finish rendering within 15 seconds`,
      { cause: error },
    );
  }
  const failedDiagram = await page.evaluate((visualSelector) => {
    const diagram = [...document.querySelectorAll("[data-mermaid-container]")]
      .find(
        (candidate) =>
          candidate.getAttribute("data-mermaid-rendered") !== "true" ||
          !candidate.querySelector(visualSelector),
      );
    if (!diagram) return null;
    return {
      label:
        diagram.getAttribute("aria-label") ??
        diagram.closest(".learning-visual")?.getAttribute("aria-label") ??
        "unlabelled Diagram",
      reason: diagram.getAttribute("data-mermaid-error"),
      rendered: diagram.getAttribute("data-mermaid-rendered") === "true",
    };
  }, nonblankSvgSelector);
  if (failedDiagram) {
    if (failedDiagram.rendered) {
      throw new Error(
        `Course "${courseSlug}" Diagram ${failedDiagram.label} has no nonblank output`,
      );
    }
    throw new Error(
      `Course "${courseSlug}" Diagram failed to render: ${failedDiagram.label}${
        failedDiagram.reason ? `. ${failedDiagram.reason}` : ""
      }`,
    );
  }
  const unresolvedChart = await page.evaluate((visualSelector) => {
    const chart = [...document.querySelectorAll('[data-course-pdf-visual="chart"]')]
      .find((candidate) => !candidate.querySelector(visualSelector));
    if (!chart) return null;
    return (
      chart.closest(".learning-visual")?.getAttribute("aria-label") ??
      "unlabelled Chart"
    );
  }, nonblankSvgSelector);
  if (unresolvedChart) {
    throw new Error(
      `Course "${courseSlug}" Chart ${unresolvedChart} has no nonblank output`,
    );
  }
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
    await page.emulateMedia({ media: "print" });
    for (const document of documents) {
      const failedResources = [];
      const trackableResource = (request) =>
        !["document", "font", "image"].includes(request.resourceType()) &&
        request.url().startsWith(origin);
      const recordFailedResponse = (resourceResponse) => {
        if (!resourceResponse.ok() && trackableResource(resourceResponse.request())) {
          failedResources.push(
            `${new URL(resourceResponse.url()).pathname} (${resourceResponse.status()})`,
          );
        }
      };
      const recordFailedRequest = (request) => {
        if (trackableResource(request)) {
          failedResources.push(
            `${new URL(request.url()).pathname} (${request.failure()?.errorText ?? "request failed"})`,
          );
        }
      };
      const assertResourcesLoaded = () => {
        if (failedResources.length > 0) {
          throw new Error(
            `Course "${document.name}" print resource failed: ${failedResources.join(", ")}`,
          );
        }
      };
      page.on("response", recordFailedResponse);
      page.on("requestfailed", recordFailedRequest);

      try {
        const response = await page.goto(
          `${origin}${scope}${COURSE_PDF_PRINT_DIRECTORY}/${encodeURIComponent(document.name)}/`,
          { waitUntil: "networkidle" },
        );
        if (!response?.ok()) {
          throw new Error(
            `Could not load print document ${document.name}: ${response?.status() ?? "no response"}`,
          );
        }
        assertResourcesLoaded();
        const margin = await preparePrintDocument(page, document.name);
        assertResourcesLoaded();
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
      } finally {
        page.off("response", recordFailedResponse);
        page.off("requestfailed", recordFailedRequest);
      }
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
