import { expect, test } from "@playwright/test";

const representativePages = [
  {
    path: "./courses/markdown/",
    heading: "Основы Markdown",
    pattern: '[data-knowledge-check][data-type="single"]',
  },
  {
    path: "./courses/markdown/capstone/",
    heading: "Понятная инструкция в Markdown",
    pattern: "[data-practice-task] [data-task-feedback]",
  },
  {
    path: "./courses/markdown/lessons/vvedenie/",
    heading: "Знакомство с Markdown",
    pattern: 'figure[aria-label="Как Markdown становится страницей"]',
  },
  {
    path: "./courses/markdown/lessons/source-render/",
    heading: "Как читать Markdown-исходник",
    pattern: '[data-knowledge-check][data-type="matching"]',
  },
  {
    path: "./courses/markdown/lessons/formatting/",
    heading: "Заголовки, выделение и списки",
    pattern: '[data-knowledge-check][data-type="ordering"]',
  },
  {
    path: "./courses/markdown/lessons/links-code/",
    heading: "Ссылки и код",
    pattern: '[data-knowledge-check][data-type="multiple"]',
  },
  {
    path: "./courses/markdown/lessons/portability/",
    heading: "Где Markdown перестаёт быть одинаковым",
    pattern: '[data-knowledge-check][data-type="exact"]',
  },
  {
    path: "./courses/markdown/lessons/review/",
    heading: "Проверка инструкции перед публикацией",
    pattern: 'figure[aria-label="Проблемы учебной инструкции по этапам проверки"]',
  },
] as const;

test("canonical acceptance pages render at desktop and narrow widths", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);

    for (const representative of representativePages) {
      await page.goto(representative.path);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: representative.heading,
        }),
      ).toBeVisible();
      await expect(page.locator(representative.pattern)).toBeVisible();
      await expect(page.locator("main h1")).toHaveCount(1);

      const headingLevels = await page
        .locator("main h1, main h2, main h3, main h4, main h5, main h6")
        .evaluateAll((headings) =>
          headings
            .filter((heading) => {
              const style = getComputedStyle(heading);
              return style.display !== "none" && style.visibility !== "hidden";
            })
            .map((heading) => Number(heading.tagName.slice(1))),
        );
      expect(headingLevels[0]).toBe(1);
      for (let index = 1; index < headingLevels.length; index += 1) {
        expect(headingLevels[index]).toBeLessThanOrEqual(
          headingLevels[index - 1] + 1,
        );
      }

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
    }
  }
});
