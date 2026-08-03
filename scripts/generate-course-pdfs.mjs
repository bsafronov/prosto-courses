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

const escapeHtmlAttribute = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function runningFurnitureTemplate({ content, furniture, margin, textAlign }) {
  const style = [
    "box-sizing: border-box",
    "width: 100%",
    `padding-inline: ${margin.left}`,
    `color: ${furniture.color}`,
    `font-family: ${furniture.fontFamily}`,
    `font-size: ${furniture.fontSize}`,
    "overflow: hidden",
    "text-overflow: ellipsis",
    "white-space: nowrap",
    `text-align: ${textAlign}`,
  ].join("; ");
  return `<div style="${escapeHtmlAttribute(style)}">${content}</div>`;
}

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
    const prepareReleaseIdentity = () => {
      const buildDate = new Date();
      document
        .querySelectorAll("[data-course-pdf-build-date]")
        .forEach((buildDateElement) => {
          if (!(buildDateElement instanceof HTMLTimeElement)) return;
          buildDateElement.dateTime = buildDate.toISOString().slice(0, 10);
          buildDateElement.textContent = new Intl.DateTimeFormat("ru-RU", {
            dateStyle: "long",
          }).format(buildDate);
        });
    };

    const prepareAuthoredImages = () => {
      document.querySelectorAll("img[loading='lazy']").forEach((image) => {
        if (image instanceof HTMLImageElement) image.loading = "eager";
      });
    };

    const prepareLinkedAppendix = ({
      activityIdPrefix,
      appendixSelector,
      destinationSelector,
      entryIdPrefix,
      entrySelector,
      numberSelector,
      prepareEntry = () => {},
      returnLinkSelector,
      sourceLinkSelector,
      sourceSelector,
      templateSelector,
    }) => {
      const appendix = document.querySelector(appendixSelector);
      const destination = appendix?.querySelector(destinationSelector);
      const sources = [...document.querySelectorAll(sourceSelector)];
      if (
        !(appendix instanceof HTMLElement) ||
        !destination ||
        sources.length === 0
      ) {
        return;
      }

      const setNumber = (root, number) => {
        root.querySelectorAll(numberSelector).forEach((label) => {
          label.textContent = String(number);
        });
      };

      for (const [index, source] of sources.entries()) {
        const number = index + 1;
        const activityId = `${activityIdPrefix}-${number}`;
        const entryId = `${entryIdPrefix}-${number}`;
        source.id = activityId;
        setNumber(source, number);

        const sourceLink = source.querySelector(sourceLinkSelector);
        if (sourceLink instanceof HTMLAnchorElement) {
          sourceLink.href = `#${entryId}`;
        }

        const template = source.querySelector(templateSelector);
        if (!(template instanceof HTMLTemplateElement)) continue;
        const fragment = template.content.cloneNode(true);
        if (!(fragment instanceof DocumentFragment)) continue;
        const entry = fragment.querySelector(entrySelector);
        if (!(entry instanceof HTMLElement)) continue;
        entry.id = entryId;
        setNumber(entry, number);
        prepareEntry({ entry, source });

        const returnLink = entry.querySelector(returnLinkSelector);
        if (returnLink instanceof HTMLAnchorElement) {
          returnLink.href = `#${activityId}`;
        }
        destination.append(fragment);
        template.remove();
      }

      appendix.hidden = false;
    };

    prepareLinkedAppendix({
      activityIdPrefix: "knowledge-check",
      appendixSelector: "[data-course-pdf-knowledge-check-appendix]",
      destinationSelector: "[data-course-pdf-knowledge-check-answers]",
      entryIdPrefix: "knowledge-check-answer",
      entrySelector: "[data-course-pdf-knowledge-check-answer-entry]",
      numberSelector: "[data-course-pdf-knowledge-check-number]",
      returnLinkSelector: "[data-course-pdf-knowledge-check-return-link]",
      sourceLinkSelector: "[data-course-pdf-knowledge-check-link]",
      sourceSelector: "[data-course-pdf-knowledge-check]",
      templateSelector: "template[data-course-pdf-knowledge-check-answer]",
    });

    prepareLinkedAppendix({
      activityIdPrefix: "practice-task",
      appendixSelector: "[data-course-pdf-practice-task-appendix]",
      destinationSelector: "[data-course-pdf-practice-task-support-list]",
      entryIdPrefix: "practice-task-support",
      entrySelector: "[data-course-pdf-practice-task-support-entry]",
      numberSelector: "[data-course-pdf-practice-task-number]",
      prepareEntry: ({ entry, source }) => {
        const authoredSupport = entry.querySelector(
          "[data-course-pdf-practice-task-authored-support]",
        );
        if (!authoredSupport) return;
        source
          .querySelectorAll("template[data-course-pdf-task-support]")
          .forEach((authoredTemplate) => {
            if (!(authoredTemplate instanceof HTMLTemplateElement)) return;
            authoredSupport.append(authoredTemplate.content.cloneNode(true));
            authoredTemplate.remove();
          });
      },
      returnLinkSelector: "[data-course-pdf-practice-task-return-link]",
      sourceLinkSelector: "[data-course-pdf-practice-task-link]",
      sourceSelector: "[data-course-pdf-practice-task]",
      templateSelector: "template[data-course-pdf-practice-task-support]",
    });

    const rewriteSameCourseReferences = () => {
      const canonicalCourseLink = document.querySelector(
        ".course-pdf__release-identity a[href]",
      );
      if (!(canonicalCourseLink instanceof HTMLAnchorElement)) return;
      const canonicalCourseUrl = new URL(canonicalCourseLink.href);
      const normalizePath = (pathname) =>
        pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
      const routeDestinations = new Map(
        [...document.querySelectorAll("[data-course-pdf-route][id]")].flatMap(
          (target) => {
            if (!(target instanceof HTMLElement)) return [];
            const route = target.dataset.coursePdfRoute;
            return route
              ? [[normalizePath(new URL(route, canonicalCourseUrl).pathname), target]]
              : [];
          },
        ),
      );

      document.querySelectorAll("a[href]").forEach((link) => {
        if (!(link instanceof HTMLAnchorElement)) return;
        if (link === canonicalCourseLink) return;
        const authoredHref = link.getAttribute("href");
        if (!authoredHref || authoredHref.startsWith("#")) return;
        const routeContainer = link.closest("[data-course-pdf-route]");
        const routeBase =
          routeContainer instanceof HTMLElement &&
          routeContainer.dataset.coursePdfRoute
            ? new URL(routeContainer.dataset.coursePdfRoute, canonicalCourseUrl)
            : canonicalCourseUrl;
        const authoredUrl = new URL(authoredHref, routeBase);
        const routeDestination = routeDestinations.get(
          normalizePath(authoredUrl.pathname),
        );
        let destination = routeDestination?.id;
        if (routeDestination && authoredUrl.hash) {
          let fragmentId;
          try {
            fragmentId = decodeURIComponent(authoredUrl.hash.slice(1));
          } catch {
            fragmentId = null;
          }
          const fragmentDestination = fragmentId
            ? document.getElementById(fragmentId)
            : null;
          destination =
            fragmentDestination &&
            (fragmentDestination === routeDestination ||
              routeDestination.contains(fragmentDestination))
              ? fragmentDestination.id
              : undefined;
        }
        if (
          authoredUrl.origin === canonicalCourseUrl.origin &&
          destination
        ) {
          link.href = `#${destination}`;
          link.removeAttribute("target");
          link.removeAttribute("rel");
          link.removeAttribute("data-external-reference");
          link.querySelector(".external-reference-marker")?.remove();
        }
      });
    };

    const prepareSourceIndex = () => {
      const sourceList = document.querySelector("[data-course-pdf-source-list]");
      const sourceSection = document.querySelector("[data-course-pdf-sources]");
      if (!sourceList || !(sourceSection instanceof HTMLElement)) return;
      const sourceNumbers = new Map();
      document.querySelectorAll("a[data-external-reference][href]").forEach(
        (link) => {
          if (!(link instanceof HTMLAnchorElement)) return;
          const url = link.href;
          let source = sourceNumbers.get(url);
          if (!source) {
            source = {
              label: link.textContent?.replace(/↗$/, "").trim() || url,
              number: sourceNumbers.size + 1,
            };
            sourceNumbers.set(url, source);

            const entry = document.createElement("li");
            entry.id = `course-pdf-source-${source.number}`;
            entry.className = "course-pdf__source-entry";
            const label = document.createElement("span");
            label.className = "course-pdf__source-label";
            label.textContent = source.label;
            const address = document.createElement("a");
            address.href = url;
            address.textContent = url;
            entry.append(label, address);
            sourceList.append(entry);
          }

          link.querySelector(".external-reference-marker")?.remove();
          const marker = document.createElement("a");
          marker.className = "external-reference-marker";
          marker.href = `#course-pdf-source-${source.number}`;
          marker.textContent = `[${source.number}]`;
          marker.setAttribute("aria-label", `Источник ${source.number}`);
          link.after(marker);
        },
      );
      sourceSection.hidden = sourceNumbers.size === 0;
    };

    prepareReleaseIdentity();
    prepareAuthoredImages();
    rewriteSameCourseReferences();
    prepareSourceIndex();
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
    const probe = document.createElement("span");
    probe.style.cssText = [
      "position: fixed",
      "visibility: hidden",
      "color: var(--color-muted)",
      "font-family: var(--font-sans)",
      "font-size: var(--font-size-meta)",
    ].join(";");
    (document.querySelector(".course-pdf") ?? document.body).append(probe);
    const furnitureStyles = getComputedStyle(probe);
    const furniture = {
      color: furnitureStyles.color,
      fontFamily: furnitureStyles.fontFamily,
      fontSize: furnitureStyles.fontSize,
    };
    probe.remove();
    return {
      furniture,
      margin: { top: block, right: inline, bottom: block, left: inline },
    };
  });
}

async function assertPrintableLayout(page, courseSlug, margin) {
  const viewport = await page.evaluate(({ block, inline }) => {
    const ruler = document.createElement("div");
    ruler.style.cssText = [
      "position: fixed",
      "visibility: hidden",
      `width: calc(210mm - 2 * ${inline})`,
      `height: calc(297mm - 2 * ${block})`,
    ].join(";");
    document.body.append(ruler);
    const { width, height } = ruler.getBoundingClientRect();
    ruler.remove();
    return { width: Math.floor(width), height: Math.floor(height) };
  }, { block: margin.top, inline: margin.left });
  await page.setViewportSize(viewport);

  const overflow = await page.evaluate(() => {
    const tolerance = 1;
    const pageLeft = document.documentElement.getBoundingClientRect().left;
    const pageRight = pageLeft + document.documentElement.clientWidth;
    const candidates = [...document.body.querySelectorAll("*")];
    const element = candidates.find((candidate) => {
      if (!(candidate instanceof HTMLElement || candidate instanceof SVGElement)) {
        return false;
      }
      const style = getComputedStyle(candidate);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.position === "fixed"
      ) {
        return false;
      }
      const bounds = candidate.getBoundingClientRect();
      return (
        bounds.width > tolerance &&
        (bounds.left < pageLeft - tolerance || bounds.right > pageRight + tolerance)
      );
    });
    if (!element) return null;

    const context = element.closest(
      "[aria-label], [data-course-pdf-route], section, article, figure",
    );
    const heading = context?.querySelector("h1, h2, h3, h4, h5, h6");
    const label =
      context?.getAttribute("aria-label") ??
      heading?.textContent?.trim() ??
      context?.id ??
      element.getAttribute("aria-label") ??
      element.id ??
      element.tagName.toLowerCase();
    return { label, element: element.tagName.toLowerCase() };
  });
  if (overflow) {
    throw new Error(
      `Course "${courseSlug}" exceeds printable width in ${overflow.label} (${overflow.element})`,
    );
  }

  const unreadableVisual = await page.evaluate(() => {
    const course = document.querySelector(".course-pdf") ?? document.body;
    const probe = document.createElement("span");
    probe.style.cssText = [
      "position: fixed",
      "visibility: hidden",
      "font-size: var(--font-size-print-min)",
    ].join(";");
    course.append(probe);
    const minimumPixels = Number.parseFloat(getComputedStyle(probe).fontSize);
    probe.remove();

    for (const visual of document.querySelectorAll(".learning-visual")) {
      const svg = visual.querySelector("svg");
      if (!(svg instanceof SVGSVGElement) || !svg.viewBox.baseVal.width) continue;
      const bounds = svg.getBoundingClientRect();
      const scale = Math.min(
        bounds.width / svg.viewBox.baseVal.width,
        svg.viewBox.baseVal.height
          ? bounds.height / svg.viewBox.baseVal.height
          : Number.POSITIVE_INFINITY,
      );
      for (const label of svg.querySelectorAll("text")) {
        const renderedPixels = Number.parseFloat(getComputedStyle(label).fontSize) * scale;
        if (renderedPixels + 0.1 >= minimumPixels) continue;
        return {
          fontSize: `${(renderedPixels * 0.75).toFixed(1)}pt`,
          label:
            visual.getAttribute("aria-label") ??
            visual.querySelector("figcaption")?.textContent?.trim() ??
            "unlabelled visual",
          minimum: `${(minimumPixels * 0.75).toFixed(1)}pt`,
        };
      }
    }
    return null;
  });
  if (unreadableVisual) {
    throw new Error(
      `Course "${courseSlug}" Learning Visual ${unreadableVisual.label} is not legible at ${unreadableVisual.fontSize}; minimum is ${unreadableVisual.minimum}`,
    );
  }
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
        const { furniture, margin } = await preparePrintDocument(page, document.name);
        await assertPrintableLayout(page, document.name, margin);
        assertResourcesLoaded();
        const filename = await page
          .locator('meta[name="course-pdf-filename"]')
          .getAttribute("content");
        if (!filename) {
          throw new Error(`Print document ${document.name} has no PDF filename`);
        }
        await page.pdf({
          displayHeaderFooter: true,
          footerTemplate: runningFurnitureTemplate({
            content: '<span class="pageNumber"></span> / <span class="totalPages"></span>',
            furniture,
            margin,
            textAlign: "right",
          }),
          format: "A4",
          headerTemplate: runningFurnitureTemplate({
            content: '<span class="title"></span>',
            furniture,
            margin,
            textAlign: "left",
          }),
          landscape: false,
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
