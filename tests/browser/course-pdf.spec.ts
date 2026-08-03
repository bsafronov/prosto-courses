import { readFile } from "node:fs/promises";
import { createCanvas } from "@napi-rs/canvas";
import { expect, test } from "@playwright/test";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { normalizePdfText } from "../../scripts/course-pdf-artifacts.mjs";
import { isPdfVisualMark } from "../support/pdf-inspection.mjs";

const coursePdfName = "prosto-courses-markdown.pdf";

const exactUrlOccurrences = (text: string, url: string) =>
  text.match(
    new RegExp(`${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![?#])`, "g"),
  ) ?? [];

type PdfStructureNode = {
  alt?: unknown;
  children?: unknown;
  lang?: unknown;
  role?: unknown;
};

function walkPdfStructure(value: unknown, visit: (node: PdfStructureNode) => void) {
  if (!value || typeof value !== "object") return;
  const node = value as PdfStructureNode;
  visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walkPdfStructure(child, visit);
  }
}

async function inspectPdf(pdf: Uint8Array) {
  const loadingTask = getDocument({ data: pdf });
  const document = await loadingTask.promise;
  const metadata = await document.getMetadata();
  const markInfo = await document.getMarkInfo();
  const outline = await document.getOutline();
  const destinationPages: Record<string, number> = {};
  const pages = [];
  const pageItems = [];
  const externalUrls: string[] = [];
  const internalLinkTargets: string[] = [];
  const structureLanguages = new Set<string>();
  const structureRoles = new Set<string>();

  const collectStructure = (value: unknown) =>
    walkPdfStructure(value, (node) => {
      if (typeof node.lang === "string") structureLanguages.add(node.lang);
      if (typeof node.role === "string") structureRoles.add(node.role);
    });

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const annotations = await page.getAnnotations();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" "),
    );
    pageItems.push(
      content.items.flatMap((item) =>
        "str" in item
          ? [{ text: item.str, x: item.transform[4], y: item.transform[5] }]
          : [],
      ),
    );
    collectStructure(await page.getStructTree());
    for (const annotation of annotations) {
      if (annotation.subtype !== "Link") continue;
      if ("url" in annotation && typeof annotation.url === "string") {
        externalUrls.push(annotation.url);
      }
      if ("dest" in annotation && typeof annotation.dest === "string") {
        internalLinkTargets.push(annotation.dest);
      }
    }
  }

  for (const name of new Set(internalLinkTargets)) {
    const destination = await document.getDestination(name);
    if (!destination) continue;
    const pageReference = destination[0];
    destinationPages[name] =
      typeof pageReference === "number"
        ? pageReference
        : await document.getPageIndex(pageReference);
  }

  await loadingTask.destroy();
  return {
    destinationPages,
    externalUrls,
    internalLinkTargets,
    markInfo,
    metadata: metadata.info,
    outline,
    pageItems,
    pages: pages.map(normalizePdfText),
    structureLanguages: [...structureLanguages],
    structureRoles: [...structureRoles],
    text: normalizePdfText(pages.join("\n")),
  };
}

function hasFollowingAuthoredTextOnPage(
  items: Array<{ text: string; x: number; y: number }>,
  heading: string,
) {
  const expected = normalizePdfText(heading);
  for (let start = 0; start < items.length; start += 1) {
    let combined = "";
    let headingBottom = Number.POSITIVE_INFINITY;
    for (let end = start; end < items.length; end += 1) {
      const part = normalizePdfText(items[end].text);
      if (!part) continue;
      combined += part;
      if (!expected.startsWith(combined)) break;
      headingBottom = Math.min(headingBottom, items[end].y);
      if (combined !== expected) continue;
      return items.slice(end + 1).some(
        (item) =>
          normalizePdfText(item.text) &&
          item.y > 45 &&
          item.y < headingBottom - 1,
      );
    }
  }
  return false;
}

function flattenOutlineTitles(
  items: Awaited<ReturnType<Awaited<ReturnType<typeof getDocument>["promise"]>["getOutline"]>>,
): string[] {
  if (!items) return [];
  return items.flatMap((item) => [
    item.title,
    ...flattenOutlineTitles(item.items),
  ]);
}

function collectAlternativeText(value: unknown, result: string[]) {
  walkPdfStructure(value, (node) => {
    if (typeof node.alt === "string") result.push(node.alt);
  });
}

async function inspectVisualPdf(pdf: Uint8Array) {
  const loadingTask = getDocument({ data: pdf });
  const document = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const operators = await page.getOperatorList();
    const alternativeText: string[] = [];
    collectAlternativeText(await page.getStructTree(), alternativeText);
    const colors = operators.fnArray.flatMap((operator, index) => {
      if (
        operator !== OPS.setFillRGBColor &&
        operator !== OPS.setStrokeRGBColor
      ) {
        return [];
      }
      const color = operators.argsArray[index]?.[0];
      return typeof color === "string" ? [color] : [];
    });
    pages.push({
      alternativeText,
      colors,
      text: normalizePdfText(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      ),
      visualMarks: operators.fnArray.filter(isPdfVisualMark).length,
    });
  }

  await loadingTask.destroy();
  return pages;
}

async function rasterPageContaining(pdf: Uint8Array, expectedText: string) {
  const loadingTask = getDocument({ data: pdf.slice() });
  const document = await loadingTask.promise;
  const normalizedExpected = normalizePdfText(expectedText);

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = normalizePdfText(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );
      if (!text.includes(normalizedExpected)) continue;

      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Map<string, number>();
      let chromaticPixels = 0;
      let edgeInkPixels = 0;
      let inkPixels = 0;
      let sideGutterInkPixels = 0;
      let sampledPixels = 0;
      const sideGutter = Math.floor((14 * 72 * 0.5) / 25.4) - 2;
      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          const offset = (y * canvas.width + x) * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const color = `${red},${green},${blue}`;
          colors.set(color, (colors.get(color) ?? 0) + 1);
          sampledPixels += 1;
          if (Math.max(red, green, blue) - Math.min(red, green, blue) > 8) {
            chromaticPixels += 1;
          }
          if (red < 248 || green < 248 || blue < 248) {
            inkPixels += 1;
            if (
              x < 2 ||
              y < 2 ||
              x >= canvas.width - 2 ||
              y >= canvas.height - 2
            ) {
              edgeInkPixels += 1;
            }
            if (x < sideGutter || x >= canvas.width - sideGutter) {
              sideGutterInkPixels += 1;
            }
          }
        }
      }
      const [dominantColor] = [...colors.entries()].sort((a, b) => b[1] - a[1])[0];
      const fontSizes = content.items.flatMap((item) =>
        "str" in item && item.str.trim()
          ? [Math.hypot(item.transform[2], item.transform[3])]
          : [],
      );
      return {
        chromaticShare: chromaticPixels / sampledPixels,
        dominantColor,
        edgeInkPixels,
        height: page.view[3] - page.view[1],
        inkShare: inkPixels / sampledPixels,
        minFontSize: Math.min(...fontSizes),
        pageNumber,
        sideGutterInkPixels,
        text,
        totalPages: document.numPages,
        width: page.view[2] - page.view[0],
      };
    }
  } finally {
    await loadingTask.destroy();
  }
  throw new Error(`PDF page containing “${expectedText}” was not found`);
}

const isMonochrome = (color: string) => {
  const match = /^#(?<red>[\da-f]{2})(?<green>[\da-f]{2})(?<blue>[\da-f]{2})$/i.exec(
    color,
  );
  return Boolean(
    match?.groups &&
      match.groups.red === match.groups.green &&
      match.groups.green === match.groups.blue,
  );
};

function knowledgeCheckMain(
  mainFlow: string,
  prompt: string,
  number: number,
) {
  const normalizedPrompt = normalizePdfText(prompt);
  const start = mainFlow.indexOf(normalizedPrompt);
  const link = `Ответиобъяснение:проверказнаний${number}`;
  const end = mainFlow.indexOf(link, start);
  expect(start, `main flow contains “${prompt}”`).toBeGreaterThanOrEqual(0);
  expect(end, `Knowledge Check ${number} links to its appendix entry`).toBeGreaterThan(
    start,
  );
  return mainFlow.slice(start, end + link.length);
}

function practiceTaskMain(mainFlow: string, title: string) {
  const titleStart = mainFlow.indexOf(normalizePdfText(title));
  expect(
    titleStart,
    `main flow contains Practice Task “${title}”`,
  ).toBeGreaterThanOrEqual(0);
  const start = Math.max(
    mainFlow.lastIndexOf("Основнаяпрактика", titleStart),
    mainFlow.lastIndexOf("Практикасвызовом", titleStart),
    mainFlow.lastIndexOf("Дополнительнаяпрактика", titleStart),
  );
  const match = mainFlow
    .slice(start)
    .match(/Поддержкаисамопроверка:практика(\d+)/);
  expect(
    match,
    `Practice Task “${title}” links to its appendix entry`,
  ).not.toBeNull();
  const number = match![1];
  const end = mainFlow.indexOf(match![0], start) + match![0].length;
  return { number, text: mainFlow.slice(start, end) };
}

test("learner downloads the complete searchable Course PDF from its Overview", async ({
  page,
}) => {
  const pdfRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".pdf")) pdfRequests.push(request.url());
  });

  await page.goto("./courses/markdown/");
  const downloadLink = page.getByRole("link", { name: "Скачать PDF" });
  await expect(downloadLink).toHaveAttribute(
    "href",
    new RegExp(`/${coursePdfName}$`),
  );
  expect(pdfRequests).toEqual([]);
  await expect(
    page.locator(
      'link[rel="preload"][href$=".pdf"], link[rel="prefetch"][href$=".pdf"]',
    ),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((entry) => entry.name.endsWith(".pdf")),
    ),
  ).toBe(false);

  const downloadPromise = page.waitForEvent("download");
  await downloadLink.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(coursePdfName);

  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const pdf = await readFile(downloadedPath!);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");

  const { text } = await inspectPdf(new Uint8Array(pdf));
  const orderedHeadings = [
    "Основы Markdown",
    "Markdown помогает хранить структуру документа прямо в обычном тексте.",
    "От исходника к структуре",
    "Знакомство с Markdown",
    "Как читать Markdown-исходник",
    "Объясни путь от исходника к документу",
    "Структура рабочей инструкции",
    "Заголовки, выделение и списки",
    "Ссылки и код",
    "Собери Markdown-памятку",
    "Проверка и переносимость",
    "Где Markdown перестаёт быть одинаковым",
    "Проверка инструкции перед публикацией",
    "Проведи редакторскую проверку",
    "Понятная инструкция в Markdown",
  ];
  let previousIndex = -1;
  for (const heading of orderedHeadings) {
    const normalizedHeading = heading.normalize("NFKC").replaceAll(/\s+/g, "");
    const index = text.indexOf(normalizedHeading, previousIndex + 1);
    expect(index, `PDF contains “${heading}” in Course order`).toBeGreaterThan(
      previousIndex,
    );
    previousIndex = index;
  }
});

test("root and repository base paths expose scoped PDF and canonical URLs", async ({
  page,
}, testInfo) => {
  const deployments = [
    {
      baseUrl: testInfo.project.use.baseURL!,
      canonicalCourseUrl:
        "https://bsafronov.github.io/prosto-courses/courses/markdown/",
    },
    {
      baseUrl: "http://127.0.0.1:4323/",
      canonicalCourseUrl: "https://bsafronov.github.io/courses/markdown/",
    },
  ];

  for (const deployment of deployments) {
    await page.goto(new URL("courses/markdown/", deployment.baseUrl).href);
    const link = page.getByRole("link", { name: "Скачать PDF" });
    await expect(link).toHaveAttribute(
      "href",
      new URL(coursePdfName, deployment.baseUrl).pathname,
    );
    await expect(link).toHaveAttribute("download", coursePdfName);
    const artifact = await page.request.get(
      new URL(coursePdfName, deployment.baseUrl).href,
    );
    expect(artifact.ok()).toBe(true);
    const inspected = await inspectPdf(new Uint8Array(await artifact.body()));
    expect(inspected.text).toContain(
      deployment.canonicalCourseUrl.replaceAll(/\s+/g, ""),
    );
  }
});

test("Course PDF identifies its release and provides complete document navigation", async ({
  page,
}, testInfo) => {
  const response = await page.request.get(
    new URL(coursePdfName, testInfo.project.use.baseURL!).href,
  );
  expect(response.ok()).toBe(true);
  const pdf = await inspectPdf(new Uint8Array(await response.body()));

  expect(pdf.metadata).toMatchObject({
    Language: "ru",
    Title: "Основы Markdown | Prosto.Courses",
  });
  expect(pdf.metadata).toHaveProperty("CreationDate");
  expect(pdf.markInfo).toMatchObject({ Marked: true, Suspects: false });
  expect(pdf.structureLanguages).toContain("ru");
  expect(pdf.structureRoles).toEqual(
    expect.arrayContaining(["Document", "H1", "H2", "H3", "Link"]),
  );
  const lowercaseText = pdf.text.toLocaleLowerCase("ru");
  for (const coverText of [
    "Проверено25июля2026г.",
    "Дата сборки PDF",
    "https://bsafronov.github.io/prosto-courses/courses/markdown/",
  ]) {
    expect(lowercaseText).toContain(
      normalizePdfText(coverText).toLocaleLowerCase("ru"),
    );
  }

  for (const section of [
    "Содержание",
    "Модули и Уроки",
    "Проверки Модулей",
    "Итоговая работа",
    "Ответы и самопроверка",
    "Источники",
  ]) {
    expect(pdf.text).toContain(normalizePdfText(section));
  }

  for (const destination of [
    "module-osnovy",
    "lesson-vvedenie",
    "checkpoint-osnovy",
    "capstone",
    "knowledge-check-appendix",
    "practice-task-appendix",
    "sources",
    "course-pdf-source-1",
  ]) {
    expect(pdf.internalLinkTargets).toContain(destination);
  }

  const orderedDestinations = [
    "course-overview",
    "module-osnovy",
    "lesson-vvedenie",
    "lesson-source-render",
    "checkpoint-osnovy",
    "module-struktura",
    "lesson-formatting",
    "lesson-links-code",
    "checkpoint-struktura",
    "module-proverka",
    "lesson-portability",
    "lesson-review",
    "checkpoint-proverka",
    "capstone",
    "knowledge-check-appendix",
    "practice-task-appendix",
    "sources",
  ];
  let previousDestinationPage = -1;
  for (const destination of orderedDestinations) {
    const pageNumber = pdf.destinationPages[destination];
    expect(pageNumber, `PDF exposes destination “${destination}”`).toBeDefined();
    expect(
      pageNumber,
      `destination “${destination}” follows Course order`,
    ).toBeGreaterThan(previousDestinationPage);
    previousDestinationPage = pageNumber;
  }

  const outlineTitles = flattenOutlineTitles(pdf.outline).map(normalizePdfText);
  const headingChecks = [
    { destination: "module-osnovy", title: "От исходника к структуре" },
    { destination: "lesson-vvedenie", title: "Знакомство с Markdown" },
    { destination: "lesson-source-render", title: "Как читать Markdown-исходник" },
    { destination: "module-struktura", title: "Структура рабочей инструкции" },
    { destination: "lesson-formatting", title: "Заголовки, выделение и списки" },
    { destination: "lesson-links-code", title: "Ссылки и код" },
    { destination: "module-proverka", title: "Проверка и переносимость" },
    { destination: "lesson-portability", title: "Где Markdown перестаёт быть одинаковым" },
    { destination: "lesson-review", title: "Проверка инструкции перед публикацией" },
  ];
  let previousOutlineIndex = -1;
  for (const { destination, title } of headingChecks) {
    const index = outlineTitles.indexOf(normalizePdfText(title));
    expect(index, `outline contains “${title}” in Course order`).toBeGreaterThan(
      previousOutlineIndex,
    );
    previousOutlineIndex = index;
    const headingPage = pdf.pageItems[pdf.destinationPages[destination]];
    expect(
      hasFollowingAuthoredTextOnPage(headingPage, title),
      `heading “${title}” is not orphaned`,
    ).toBe(true);
  }

  const commonMarkUrl = "https://spec.commonmark.org/0.31.2/";
  const chartSourceUrl =
    "https://github.com/bsafronov/prosto-courses/blob/main/src/content/courses/markdown/modules/proverka/lessons/review.mdx";
  expect(pdf.externalUrls).toContain(
    "https://bsafronov.github.io/prosto-courses/courses/markdown/",
  );
  expect(pdf.externalUrls).toContain(commonMarkUrl);
  expect(pdf.externalUrls).toContain(chartSourceUrl);
  expect(pdf.text).toContain(normalizePdfText("CommonMark 0.31.2[1]"));
  expect(exactUrlOccurrences(pdf.text, commonMarkUrl)).toHaveLength(1);
  expect(exactUrlOccurrences(pdf.text, chartSourceUrl)).toHaveLength(1);

  const fixtureResponse = await page.request.get(
    new URL(
      "prosto-courses-accessible-images.pdf",
      testInfo.project.use.baseURL!,
    ).href,
  );
  expect(fixtureResponse.ok()).toBe(true);
  const fixturePdf = await inspectPdf(
    new Uint8Array(await fixtureResponse.body()),
  );
  expect(fixturePdf.text).toContain(
    normalizePdfText("Требуется повторная проверка"),
  );
  expect(fixturePdf.text).toContain(
    normalizePdfText(
      "https://github.com/bsafronov/prosto-courses/blob/main/tests/fixtures/valid-course/accessible-images/modules/alt-text/lessons/describe-purpose.mdx",
    ),
  );
});

test("Course PDF preserves meaningful print presentation for every Learning Visual", async ({
  page,
}, testInfo) => {
  const pdfResponse = async (filename: string) => {
    const response = await page.request.get(
      new URL(filename, testInfo.project.use.baseURL!).href,
    );
    expect(response.ok(), filename).toBe(true);
    return inspectVisualPdf(new Uint8Array(await response.body()));
  };

  const markdownPages = await pdfResponse(coursePdfName);
  const markdownText = markdownPages.map((candidate) => candidate.text).join("");
  const chartPage = markdownPages.find((candidate) =>
    candidate.text.includes(
      normalizePdfText("Данные: Проблемы учебной инструкции по этапам проверки"),
    ),
  );
  expect(chartPage).toBeDefined();
  for (const expected of [
    "Проблемы учебной инструкции по этапам проверки",
    "Этап (этап)",
    "Число найденных проблем (проблема)",
    "Структура",
    "Точность",
    "Черновик 4 3",
    "1: 4",
    "2: 3",
    "Самопроверка 2 2",
    "Проверка коллегой 1 1",
    "После самопроверки остаются четыре проблемы",
    "Смоделированный журнал проверки в исходнике этого Урока",
  ]) {
    expect(markdownText).toContain(normalizePdfText(expected));
  }
  expect(chartPage!.visualMarks).toBeGreaterThan(10);
  expect(chartPage!.colors.every(isMonochrome)).toBe(true);

  const diagramTitle = "Как Markdown становится страницей";
  const diagramPage = markdownPages.find((candidate) =>
    candidate.text.includes(normalizePdfText(diagramTitle)),
  );
  expect(diagramPage).toBeDefined();
  for (const expected of [
    "Содержание",
    "Исходник с разметкой",
    "Преобразователь",
    "Структурированный документ",
    "Содержание и знаки Markdown образуют исходник",
    "Читай схему слева направо",
    "Markdown хранит структуру отдельно от оформления",
  ]) {
    expect(diagramPage!.text).toContain(normalizePdfText(expected));
  }
  expect(diagramPage!.alternativeText).toContain(diagramTitle);
  expect(diagramPage!.visualMarks).toBeGreaterThan(10);
  expect(diagramPage!.colors.every(isMonochrome)).toBe(true);
  expect(markdownText).not.toContain(normalizePdfText("Увеличить схему"));
  expect(markdownText).not.toContain(
    normalizePdfText("Закрыть развернутую схему"),
  );

  const imagePages = await pdfResponse(
    "prosto-courses-accessible-images.pdf",
  );
  const imageText = imagePages.map((candidate) => candidate.text).join("");
  const imageAlt = "A red and blue rectangle labeled Context";
  const imagePage = imagePages.find((candidate) =>
    candidate.alternativeText.includes(imageAlt),
  );
  expect(imagePage).toBeDefined();
  for (const expected of [
    "Illustrative context label used to test sourced-image alternatives.",
    "Generated platform fixture",
    "Course-owned",
    "Иллюстративное сгенерированное изображение.",
  ]) {
    expect(imageText).toContain(normalizePdfText(expected));
  }
  expect(imagePage!.colors).toEqual(
    expect.arrayContaining(["#d02040", "#1466cc"]),
  );
  expect(imagePage!.visualMarks).toBeGreaterThan(0);
});

test("representative actual PDF pages rasterize as readable monochrome A4 output", async ({
  page,
}, testInfo) => {
  const markdownResponse = await page.request.get(
    new URL(coursePdfName, testInfo.project.use.baseURL!).href,
  );
  expect(markdownResponse.ok()).toBe(true);
  const markdownPdf = new Uint8Array(await markdownResponse.body());
  const searchableMarkdown = await inspectPdf(markdownPdf.slice());
  expect(searchableMarkdown.text).toContain(
    normalizePdfText('console.log("Привет!");'),
  );
  const [cover, toc, denseLesson, appendix] = await Promise.all(
    [
      "Научись создавать, проверять и улучшать рабочие инструкции",
      "Модули и Уроки",
      "Короткую команду или имя файла",
      "Проверка знаний 1 Задание",
    ].map((label) => rasterPageContaining(markdownPdf, label)),
  );

  expect(cover.pageNumber).toBe(1);
  expect(cover.inkShare).toBeLessThan(toc.inkShare);

  for (const raster of [cover, toc, denseLesson, appendix]) {
    expect(raster.dominantColor, `page ${raster.pageNumber} canvas`).toBe(
      "255,255,255",
    );
    expect(raster.inkShare, `page ${raster.pageNumber} is nonblank`).toBeGreaterThan(
      0.005,
    );
    expect(raster.chromaticShare, `page ${raster.pageNumber} is monochrome`).toBe(0);
    expect(raster.edgeInkPixels, `page ${raster.pageNumber} is not clipped`).toBe(0);
    expect(
      raster.sideGutterInkPixels,
      `page ${raster.pageNumber} stays inside printable side margins`,
    ).toBe(0);
    expect(raster.text).toContain(normalizePdfText("Основы Markdown | Prosto.Courses"));
    expect(raster.text).toContain(`${raster.pageNumber}/${raster.totalPages}`);
    expect(
      Math.abs(raster.width - 595.28),
      `page ${raster.pageNumber} A4 width`,
    ).toBeLessThan(1.5);
    expect(
      Math.abs(raster.height - 841.89),
      `page ${raster.pageNumber} A4 height`,
    ).toBeLessThan(1.5);
    expect(raster.minFontSize, `page ${raster.pageNumber} remains legible`).toBeGreaterThanOrEqual(
      7.5,
    );
  }

  const imageResponse = await page.request.get(
    new URL("prosto-courses-accessible-images.pdf", testInfo.project.use.baseURL!).href,
  );
  expect(imageResponse.ok()).toBe(true);
  const authoredImage = await rasterPageContaining(
    new Uint8Array(await imageResponse.body()),
    "Illustrative context label used to test sourced-image alternatives.",
  );
  expect(authoredImage.chromaticShare).toBeGreaterThan(0.001);
});

test("Knowledge Checks remain answerable on paper and link to a spoiler appendix", async ({
  page,
}, testInfo) => {
  const localAnswer = "ЛОКАЛЬНЫЙ ОТВЕТ НЕ ДОЛЖЕН ПОПАСТЬ В PDF";
  await page.goto("./courses/markdown/lessons/portability/");
  const exactCheck = page.locator(
    '[data-knowledge-check][data-type="exact"]',
  );
  await exactCheck.locator("[data-exact-answer]").fill(localAnswer);
  await exactCheck.getByRole("button", { name: "Проверить ответ" }).click();
  await expect(exactCheck.locator("[data-feedback]")).not.toBeEmpty();

  const markdownResponse = await page.request.get(
    new URL(coursePdfName, testInfo.project.use.baseURL!).href,
  );
  expect(markdownResponse.ok()).toBe(true);
  const markdown = await inspectPdf(
    new Uint8Array(await markdownResponse.body()),
  );
  const appendixStart = markdown.text.lastIndexOf("Ответыкпроверкамзнаний");
  expect(appendixStart).toBeGreaterThan(0);

  const mainFlow = markdown.text.slice(0, appendixStart);
  const appendix = markdown.text.slice(appendixStart);
  const single = knowledgeCheckMain(
    mainFlow,
    "Какое действие понадобится для практики в этом Курсе?",
    1,
  );
  expect(single).toContain("Отметьодинответ.");
  expect(single).toContain("Создатьисохранитьобычныйтекстовыйфайл");
  expect(single).toContain("Настроитьбазуданных");

  const matching = knowledgeCheckMain(
    mainFlow,
    "Сопоставь фрагмент исходника с его ролью.",
    3,
  );
  expect(matching).toContain("Соединикаждуюстрокусоднимвариантомответа.");
  expect(matching.match(/Ответ:/g)).toHaveLength(3);
  const matchingOptions = [
    "Пунктмаркированногосписка",
    "Кодвнутристроки",
    "Блок-заголовок",
  ];
  let previousMatchingOption = -1;
  for (const option of matchingOptions) {
    const index = matching.indexOf(option);
    expect(index).toBeGreaterThan(previousMatchingOption);
    previousMatchingOption = index;
  }

  const ordering = knowledgeCheckMain(
    mainFlow,
    "Расположи действия так, чтобы сначала спроектировать структуру, а затем проверить её.",
    5,
  );
  expect(ordering).toContain(
    "Укажипорядокшагов:впишиномерпозициирядомскаждымшагом.",
  );
  expect(ordering.match(/Позиция:__/g)).toHaveLength(4);
  expect(ordering.indexOf("Сгруппироватьсвязанныедействия")).toBeLessThan(
    ordering.indexOf("Сформулироватьрезультатчитателя"),
  );

  const multiple = knowledgeCheckMain(
    mainFlow,
    "Какие части нужны для обычной Markdown-ссылки?",
    6,
  );
  expect(multiple).toContain("Отметьвсеподходящиеответы.");
  expect(multiple).toContain("Текствквадратныхскобках");
  expect(multiple).toContain("Адресвкруглыхскобках");
  expect(multiple).toContain("Символ#передссылкой");

  const exact = knowledgeCheckMain(
    mainFlow,
    "Как называется базовая спецификация, поверх которой GFM определяет расширения? Введи одно слово.",
    7,
  );
  expect(exact).toContain("Запишиточныйответ.");
  expect(exact).toContain("Ответ:");
  expect(mainFlow).not.toContain("Перетащишагизаполосусправа.");
  expect(mainFlow).not.toContain("Проверитьответ");
  expect(markdown.text).not.toContain(normalizePdfText(localAnswer));

  expect(appendix).toContain(
    "Проверказнаний1Задание:КакоедействиепонадобитсядляпрактикивэтомКурсе?",
  );
  expect(appendix).toContain(
    "Проверказнаний3Задание:Сопоставьфрагментисходникасегоролью.",
  );
  expect(appendix).toContain(
    "Проверказнаний5Задание:Расположидействиятак,чтобысначаласпроектироватьструктуру,азатемпроверитьеё.",
  );
  expect(appendix).toContain(
    "Проверказнаний6Задание:КакиечастинужныдляобычнойMarkdown-ссылки?",
  );
  expect(appendix).toContain(
    "Проверказнаний7Задание:Какназываетсябазоваяспецификация,поверхкоторойGFMопределяетрасширения?Введиоднослово.",
  );
  expect(appendix).toContain("Правильныйответ:CommonMark");
  expect(appendix).toContain(
    "GFMописываетрасширенияповерхспецификацииCommonMark.",
  );
  expect(appendix).toContain(
    "Да:этоттекстобъясняетчитателюназначениессылки.",
  );
  expect(appendix).toContain(
    "Символ#передссылкой:Символ#создаётзаголовокинеявляетсяобязательнойчастьюссылки.",
  );
  expect(appendix).toContain("Правильныйпорядок:");
  expect(appendix).toContain(
    "1.Назватьцелевуюсредупубликации2.Выделитьконструкции,откоторыхзависитсмысл",
  );

  expect(
    new Set(
      markdown.internalLinkTargets.filter((destination) =>
        /^knowledge-check-answer-\d+$/.test(destination),
      ),
    ).size,
  ).toBe(9);
  expect(
    new Set(
      markdown.internalLinkTargets.filter((destination) =>
        /^knowledge-check-\d+$/.test(destination),
      ),
    ).size,
  ).toBe(9);

  const numericResponse = await page.request.get(
    new URL(
      "prosto-courses-python-dlya-analitika.pdf",
      testInfo.project.use.baseURL!,
    ).href,
  );
  expect(numericResponse.ok()).toBe(true);
  const numeric = await inspectPdf(new Uint8Array(await numericResponse.body()));
  const numericPrompt = numeric.text.indexOf(
    "Каковавыручкапервогорегионапослеrevenue.sum(axis=1)?",
  );
  const numericAppendix = numeric.text.lastIndexOf("Ответыкпроверкамзнаний");
  expect(numericPrompt).toBeGreaterThan(0);
  expect(numericPrompt).toBeLessThan(numericAppendix);
  const numericMain = numeric.text.slice(numericPrompt, numericAppendix);
  expect(numericMain).toContain(
    "Запишичисловойответ.Единицаизмерения:₽.",
  );
  expect(numericMain).toContain("Ответ:");
  const numericLink = numericMain.match(
    /Ответиобъяснение:проверказнаний(\d+)/,
  );
  expect(numericLink).not.toBeNull();
  const numericCheckNumber = numericLink![1];
  expect(numeric.text.slice(numericAppendix)).toContain(
    `Проверказнаний${numericCheckNumber}Задание:Каковавыручкапервогорегионапослеrevenue.sum(axis=1)?Правильныйответ:31200₽`,
  );
  expect(numeric.internalLinkTargets).toContain(
    `knowledge-check-answer-${numericCheckNumber}`,
  );
  expect(numeric.internalLinkTargets).toContain(
    `knowledge-check-${numericCheckNumber}`,
  );
  expect(
    new Set(
      numeric.internalLinkTargets.filter((destination) =>
        /^knowledge-check-answer-\d+$/.test(destination),
      ),
    ).size,
  ).toBe(17);
  expect(
    new Set(
      numeric.internalLinkTargets.filter((destination) =>
        /^knowledge-check-\d+$/.test(destination),
      ),
    ).size,
  ).toBe(17);
});

test("Practice Tasks keep their contract and working space while revealable support moves to the appendix", async ({
  page,
}, testInfo) => {
  const response = await page.request.get(
    new URL(coursePdfName, testInfo.project.use.baseURL!).href,
  );
  expect(response.ok()).toBe(true);
  const responseBody = await response.body();
  const pdf = await inspectPdf(Uint8Array.from(responseBody));
  const visualPages = await inspectVisualPdf(Uint8Array.from(responseBody));
  const appendixStart = pdf.text.lastIndexOf("Поддержкаисамопроверка");
  expect(appendixStart).toBeGreaterThan(0);

  const mainFlow = pdf.text.slice(0, appendixStart);
  const appendix = pdf.text.slice(appendixStart);
  const solutionTask = practiceTaskMain(mainFlow, "Разметь карту исходника");
  expect(solutionTask.text).toContain("Практикасвызовом·10мин");
  expect(solutionTask.text).toContain(
    "Цель:РазложитьMarkdown-фрагментнаблокиистрочныеэлементы",
  );
  expect(solutionTask.text).toContain(
    "ОграниченияНезапускайпредварительныйпросмотр",
  );
  expect(solutionTask.text).toContain(
    "КритерииготовностиКаждыйблокназванвпорядкечтения",
  );
  expect(solutionTask.text).toContain(
    "Разбериэтотисходникбезпредварительногопросмотра:",
  );
  expect(solutionTask.text).toContain("Местодляработы");
  const solutionTaskPageIndex = visualPages.findIndex((page) =>
    page.text.includes("Разметькартуисходника"),
  );
  expect(solutionTaskPageIndex).toBeGreaterThanOrEqual(0);
  const solutionTaskPages = visualPages.slice(
    solutionTaskPageIndex,
    solutionTaskPageIndex + 2,
  );
  expect(solutionTaskPages.map((page) => page.text).join()).toContain(
    "Местодляработы",
  );
  expect(
    solutionTaskPages.reduce((total, page) => total + page.visualMarks, 0),
  ).toBeGreaterThanOrEqual(8);

  const rubricTask = practiceTaskMain(mainFlow, "Собери памятку перед выпуском");
  expect(rubricTask.text).toContain("Основнаяпрактика·20мин");
  expect(rubricTask.text).toContain("Местодляработы");

  for (const revealOnlyText of [
    "Проведиграницыпопустымстрокаминачалампунктов.",
    "Впорядкечтенияидутзаголовокпервогоуровня",
    "Позаголовкамиспискуможновосстановитьцель",
  ]) {
    expect(mainFlow).not.toContain(revealOnlyText);
    expect(appendix).toContain(revealOnlyText);
  }
  expect(appendix).toContain(
    `Практическоезадание${solutionTask.number}:Разметькартуисходника`,
  );
  expect(appendix).toContain("Подсказки");
  expect(appendix).toContain("Разборрешения");
  expect(appendix).toContain("Ходрассуждения");
  expect(appendix).toContain("Другойподход");
  expect(appendix).toContain("Вероятныеошибки");
  expect(appendix).toContain(
    `Практическоезадание${rubricTask.number}:Соберипамяткупередвыпуском`,
  );
  expect(appendix).toContain("Самопроверка");
  expect(appendix).toContain("Структураведёткрезультату");

  for (const number of [solutionTask.number, rubricTask.number]) {
    expect(
      pdf.internalLinkTargets.filter(
        (target) => target === `practice-task-${number}`,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      pdf.internalLinkTargets.filter(
        (target) => target === `practice-task-support-${number}`,
      ).length,
    ).toBeGreaterThan(0);
  }

  expect(pdf.text).toContain("ДОПОЛНИТЕЛЬНО—НЕОБЯЗАТЕЛЬНО");

  const stretchResponse = await page.request.get(
    new URL(
      "prosto-courses-accessible-images.pdf",
      testInfo.project.use.baseURL!,
    ).href,
  );
  expect(stretchResponse.ok()).toBe(true);
  const stretchPdf = await inspectPdf(
    Uint8Array.from(await stretchResponse.body()),
  );
  expect(stretchPdf.text).toContain(
    "Дополнительнаяпрактика·5минPolishanoptionaldescription",
  );
});

test("Reflections provide guided paper space without browser-local state or controls", async ({
  page,
}, testInfo) => {
  const localReflection = "ЛОКАЛЬНАЯ РЕФЛЕКСИЯ НЕ ДОЛЖНА ПОПАСТЬ В PDF";
  await page.goto("./courses/markdown/lessons/source-render/");
  await page.locator("[data-reflection-note]").fill(localReflection);
  await expect(page.locator("[data-reflection-status]")).toContainText(
    "Черновик сохранён",
  );
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await expect(
    page.locator("header").getByLabel("Статус урока: Завершён"),
  ).toBeVisible();

  const response = await page.request.get(
    new URL(coursePdfName, testInfo.project.use.baseURL!).href,
  );
  expect(response.ok()).toBe(true);
  const responseBody = await response.body();
  const { text } = await inspectPdf(Uint8Array.from(responseBody));
  const visualPages = await inspectVisualPdf(Uint8Array.from(responseBody));

  for (const expected of [
    "Осмыслиопыт",
    "КакдвухпроходнаяпроверкаизмениттвойспособчитатьMarkdown-исходник?",
    "Еслиполезно,опирайсянавопросы:",
    "Назови,чтобудешьискатьпервым",
    "Опишиошибку,которуютакойпорядокпоможетзаметить",
    "Местодлязаписи",
  ]) {
    expect(text).toContain(expected);
  }
  const reflectionPage = visualPages.find((page) =>
    page.text.includes(
      "КакдвухпроходнаяпроверкаизмениттвойспособчитатьMarkdown-исходник?",
    ),
  );
  expect(reflectionPage?.text).toContain("Местодлязаписи");
  expect(reflectionPage?.visualMarks).toBeGreaterThanOrEqual(9);

  for (const browserOnlyText of [
    normalizePdfText(localReflection),
    "Твоязаметка",
    "Текстостаётсятольковэтомбраузереиникуданеотправляется.",
    "Экспортировать",
    "Удалитьнавсегда",
    "КопироватьЭкспортировать",
    "Показатьподсказку",
    "Всеподсказкиоткрыты",
    "Отметитькакзавершённый",
    "Завершитьурок",
    "Статусурока:Завершён",
    "Курсзавершён",
    "Переключитьтему",
    "Установитьприложение",
    "Открытьнавигациюпокурсу",
  ]) {
    expect(text).not.toContain(browserOnlyText);
  }

  await page.evaluate(() => localStorage.clear());
});

test("production build emits one Course PDF for every Catalog Course", async ({
  page,
}) => {
  await page.goto("./");
  const coursePaths = [
    ...new Set(
      await page.locator("article a[href*='/courses/']").evaluateAll((links) =>
        links.map((link) => new URL(link.getAttribute("href")!, document.baseURI).pathname),
      ),
    ),
  ];
  expect(coursePaths.length).toBeGreaterThan(1);

  for (const coursePath of coursePaths) {
    const courseSlug = coursePath.split("/").filter(Boolean).at(-1)!;
    await page.goto(coursePath);
    const link = page.getByRole("link", { name: "Скачать PDF" });
    const filename = `prosto-courses-${courseSlug}.pdf`;
    await expect(link).toHaveAttribute("download", filename);
    const href = await link.getAttribute("href");
    const response = await page.request.get(new URL(href!, page.url()).href);
    expect(response.ok(), filename).toBe(true);
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  }
});

test("Course PDFs stay outside public routes and Offline Availability", async ({
  page,
}, testInfo) => {
  const baseUrl = new URL(testInfo.project.use.baseURL!);
  const printDocument = await page.request.get(
    new URL("course-pdf-print/markdown/", baseUrl).href,
  );
  expect(printDocument.status()).toBe(404);

  const fixtureUrl = new URL(baseUrl);
  fixtureUrl.pathname = "/__test__/release";
  const releaseResponse = await page.request.get(fixtureUrl.href);
  expect(releaseResponse.ok()).toBe(true);
  const release = (await releaseResponse.json()) as { releaseUrls: string[] };
  expect(release.releaseUrls).not.toContain(
    new URL(coursePdfName, baseUrl).pathname,
  );

  const serviceWorker = await page.request.get(new URL("sw.js", baseUrl).href);
  expect(await serviceWorker.text()).not.toContain(coursePdfName);
});
