import { expect, test } from "@playwright/test";

const acceptanceSurfaces = {
  catalog: {
    path: "./",
    heading: "Выбери Курс и начни с первого Урока.",
    function: ".catalog-open",
  },
  courseOverview: {
    path: "./courses/markdown/",
    heading: "Основы Markdown",
    function: "[data-course-action]",
  },
  module: {
    path: "./courses/markdown/modules/osnovy/",
    heading: "От исходника к структуре",
    function: ".lesson-list [data-lesson-link]",
  },
  lesson: {
    path: "./courses/markdown/lessons/vvedenie/",
    heading: "Знакомство с Markdown",
    function: "[data-knowledge-check]",
  },
  moduleCheckpoint: {
    path: "./courses/markdown/modules/osnovy/checkpoint/",
    heading: "Объясни путь от исходника к документу",
    function: "[data-practice-task]",
  },
  capstone: {
    path: "./courses/markdown/capstone/",
    heading: "Понятная инструкция в Markdown",
    function: "[data-practice-task]",
  },
  offline: {
    path: "./offline/",
    heading: "Эта страница не сохранена",
    function: "main a",
  },
} as const;

const representativePages = [
  {
    ...acceptanceSurfaces.courseOverview,
    pattern: '[data-knowledge-check][data-type="single"]',
  },
  {
    ...acceptanceSurfaces.capstone,
    pattern: "[data-practice-task] [data-task-feedback]",
  },
  {
    ...acceptanceSurfaces.lesson,
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

for (const theme of ["light", "dark"] as const) {
  for (const accommodation of [
    "400% reflow equivalent",
    "200% text zoom",
    "WCAG text spacing",
  ] as const) {
    test(`all acceptance surfaces preserve content and functions with ${accommodation} in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 800 });

      for (const surface of Object.values(acceptanceSurfaces)) {
        await page.goto(surface.path);
        await page
          .getByRole("combobox", { name: "Тема оформления" })
          .selectOption(theme);

        if (accommodation === "200% text zoom") {
          await page.evaluate(() => {
            document.documentElement.style.fontSize = "200%";
          });
        }
        if (accommodation === "WCAG text spacing") {
          await page.addStyleTag({
            content: `
              main, main * {
                line-height: 1.5 !important;
                letter-spacing: 0.12em !important;
                word-spacing: 0.16em !important;
              }
              main p { margin-bottom: 2em !important; }
            `,
          });
        }

        await expect(
          page.getByRole("heading", { level: 1, name: surface.heading }),
        ).toBeVisible();
        await expect(page.locator("main")).toBeVisible();
        await expect(page.locator(surface.function).first()).toBeVisible();
        const functionLayout = await page
          .locator(
            "main :is(a[href], button, input, select, textarea, summary, [tabindex])",
          )
          .evaluateAll((elements) => {
            const visible = elements
              .map((element) => ({
                element,
                box: element.getBoundingClientRect(),
                style: getComputedStyle(element),
              }))
              .filter(
                ({ box, style }) =>
                  style.display !== "none" &&
                  style.visibility !== "hidden" &&
                  box.width > 0 &&
                  box.height > 0,
              );
            const outside = visible
              .filter(
                ({ box }) => box.left < 0 || box.right > innerWidth,
              )
              .map(({ element }) => element.outerHTML.slice(0, 160));
            const overlaps = visible.flatMap((first, index) =>
              visible.slice(index + 1).flatMap((second) => {
                const intersects =
                  first.box.left < second.box.right &&
                  first.box.right > second.box.left &&
                  first.box.top < second.box.bottom &&
                  first.box.bottom > second.box.top;
                return intersects
                  ? [[
                      first.element.outerHTML.slice(0, 80),
                      second.element.outerHTML.slice(0, 80),
                    ]]
                  : [];
              }),
            );
            return { outside, overlaps };
          });
        expect(functionLayout).toEqual({ outside: [], overlaps: [] });
        expect(
          await page.locator("main *").evaluateAll((elements) =>
            elements
              .filter((element) => {
                const style = getComputedStyle(element);
                return (
                  !element.closest(".sr-only") &&
                  (style.overflowX === "hidden" ||
                    style.overflowX === "clip") &&
                  element.scrollWidth > element.clientWidth + 1 &&
                  (element.textContent?.trim().length ?? 0) > 0
                );
              })
              .map((element) => element.outerHTML.slice(0, 160)),
          ),
        ).toEqual([]);
        const layout = await page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            overflowers: [...document.querySelectorAll<HTMLElement>("body *")]
              .filter(
                (element) =>
                  element.getBoundingClientRect().right > innerWidth ||
                  (element.scrollWidth > element.clientWidth &&
                    getComputedStyle(element).overflowX === "visible"),
              )
              .slice(0, 20)
              .map((element) => ({
                className: element.className,
                clientWidth: element.clientWidth,
                right: Math.round(element.getBoundingClientRect().right),
                scrollWidth: element.scrollWidth,
                tagName: element.tagName,
              })),
          }));
        expect(
          layout.scrollWidth,
          `Overflowing elements: ${JSON.stringify(layout.overflowers)}`,
        ).toBe(layout.clientWidth);
      }
    });
  }
}
