import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const coursePdfName = "prosto-courses-markdown.pdf";

async function inspectPdf(pdf: Uint8Array) {
  const loadingTask = getDocument({ data: pdf });
  const document = await loadingTask.promise;
  const pages = [];
  const internalDestinations: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const annotations = await page.getAnnotations();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" "),
    );
    for (const annotation of annotations) {
      if (annotation.subtype !== "Link" || !("dest" in annotation)) continue;
      if (typeof annotation.dest === "string") {
        internalDestinations.push(annotation.dest);
      }
    }
  }

  await loadingTask.destroy();
  return {
    internalDestinations,
    text: pages
      .join("\n")
      .normalize("NFKC")
      .replaceAll(/[\s\u00ad]+/g, ""),
  };
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

test("Knowledge Checks remain answerable on paper and link to a spoiler appendix", async ({
  page,
}, testInfo) => {
  await page.goto("./courses/markdown/");
  await page.evaluate(() => {
    localStorage.setItem(
      "knowledge-check-attempt",
      "ЛОКАЛЬНЫЙ ОТВЕТ НЕ ДОЛЖЕН ПОПАСТЬ В PDF",
    );
  });

  const markdownResponse = await page.request.get(
    new URL(coursePdfName, testInfo.project.use.baseURL!).href,
  );
  expect(markdownResponse.ok()).toBe(true);
  const markdown = await inspectPdf(
    new Uint8Array(await markdownResponse.body()),
  );
  const appendixStart = markdown.text.indexOf("Ответыкпроверкамзнаний");
  expect(appendixStart).toBeGreaterThan(0);

  const mainFlow = markdown.text.slice(0, appendixStart);
  const appendix = markdown.text.slice(appendixStart);
  expect(mainFlow).toContain("Отметьодинответ.");
  expect(mainFlow).toContain("Отметьвсеподходящиеответы.");
  expect(mainFlow).toContain(
    "Соединикаждуюстрокусоднимвариантомответа.",
  );
  expect(mainFlow).toContain("Запишиточныйответ.");
  expect(mainFlow).toContain(
    "Укажипорядокшагов:впишиномерпозициирядомскаждымшагом.",
  );
  expect(mainFlow).not.toContain("Перетащишагизаполосусправа.");
  expect(mainFlow).not.toContain("Проверитьответ");
  expect(mainFlow).not.toContain("ЛОКАЛЬНЫЙОТВЕТНЕДОЛЖЕНПОПАСТЬВPDF");

  expect(appendix).toContain("Правильныйответ:CommonMark");
  expect(appendix).toContain(
    "GFMописываетрасширенияповерхспецификацииCommonMark.",
  );
  expect(appendix).toContain(
    "Да:этоттекстобъясняетчитателюназначениессылки.",
  );
  expect(appendix).toContain("Правильныйпорядок:");
  expect(appendix).toContain(
    "1.Назватьцелевуюсредупубликации2.Выделитьконструкции,откоторыхзависитсмысл",
  );
  expect(appendix).not.toContain("knowledge-check-attempt");

  expect(
    new Set(markdown.internalDestinations.filter((destination) =>
      /^knowledge-check-answer-\d+$/.test(destination),
    )).size,
  ).toBe(9);
  expect(
    new Set(markdown.internalDestinations.filter((destination) =>
      /^knowledge-check-\d+$/.test(destination),
    )).size,
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
  const numericAppendix = numeric.text.indexOf("Ответыкпроверкамзнаний");
  expect(numericPrompt).toBeGreaterThan(0);
  expect(numericPrompt).toBeLessThan(numericAppendix);
  expect(numeric.text.slice(numericPrompt, numericAppendix)).toContain(
    "Запишичисловойответ.Единицаизмерения:₽.",
  );
  expect(numeric.text.slice(numericAppendix)).toContain(
    "Правильныйответ:31200₽",
  );
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
