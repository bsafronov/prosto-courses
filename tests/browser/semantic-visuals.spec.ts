import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectBoxCloseTo } from "../support/browser-geometry.mjs";

const visualThemes = {
  light: {
    border: "rgb(228, 228, 231)",
    focus: "rgb(63, 63, 70)",
    ink: "rgb(24, 24, 27)",
    muted: "rgb(113, 113, 122)",
  },
  dark: {
    border: "rgb(39, 39, 42)",
    focus: "rgb(212, 212, 216)",
    ink: "rgb(250, 250, 250)",
    muted: "rgb(161, 161, 170)",
  },
} as const;
type VisualTheme = keyof typeof visualThemes;

async function selectTheme(page: Page, theme: VisualTheme) {
  await page
    .getByRole("combobox", { name: "Тема оформления" })
    .selectOption(theme);
}

async function expectNoPageOverflow(page: Page, width: number) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(width);
}

async function svgTextLayout(
  svg: Locator,
  labelSelector: string,
  overlapSelector = labelSelector,
) {
  return svg.evaluate(
    (element, selectors) => {
      const frame = element.getBoundingClientRect();
      const labels = [
        ...element.querySelectorAll<SVGTextElement>(selectors.label),
      ].map((label) => ({
        box: label.getBoundingClientRect(),
        text: label.textContent,
      }));
      const overlapLabels = [
        ...element.querySelectorAll<SVGTextElement>(selectors.overlap),
      ].map((label) => ({
        box: label.getBoundingClientRect(),
        text: label.textContent,
      }));
      return {
        outside: labels
          .filter(
            ({ box }) =>
              box.left < frame.left ||
              box.right > frame.right ||
              box.top < frame.top ||
              box.bottom > frame.bottom,
          )
          .map(({ box, text }) => ({
            box: {
              bottom: Math.round(box.bottom - frame.top),
              left: Math.round(box.left - frame.left),
              right: Math.round(box.right - frame.left),
              top: Math.round(box.top - frame.top),
            },
            frame: {
              height: Math.round(frame.height),
              width: Math.round(frame.width),
            },
            text,
          })),
        overlaps: overlapLabels.flatMap((label, index) =>
          overlapLabels.slice(index + 1).flatMap((candidate) => {
            const intersects =
              label.box.left < candidate.box.right &&
              label.box.right > candidate.box.left &&
              label.box.top < candidate.box.bottom &&
              label.box.bottom > candidate.box.top;
            return intersects ? [`${label.text} / ${candidate.text}`] : [];
          }),
        ),
      };
    },
    { label: labelSelector, overlap: overlapSelector },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("./courses/markdown/lessons/vvedenie/");
});

test("Callouts expose their meaning in text and structure without relying on color", async ({
  page,
}) => {
  const keyIdea = page.getByRole("complementary", {
    name: "Ключевая мысль",
  });
  await expect(keyIdea).toBeVisible();
  await expect(keyIdea.getByText("Ключевая мысль", { exact: true })).toBeVisible();
  await expect(keyIdea).toContainText(
    "Разметка описывает роль фрагмента текста, а не его точный внешний вид.",
  );

  await page.goto("./courses/markdown/lessons/formatting/");
  const advanced = page.getByRole("complementary", {
    name: "Дополнительно — необязательно",
  });
  await expect(advanced).toBeVisible();
  await expect(advanced).toContainText("необязательно");
});

test("Diagram renders Mermaid with an equivalent visible interpretation", async ({
  page,
}) => {
  const diagram = page.getByRole("figure", {
    name: "Как Markdown становится страницей",
  });
  await expect(diagram).toBeVisible();
  await expect(
    diagram.getByRole("img", {
      name: "Содержание и знаки Markdown образуют исходник, который преобразователь превращает в структурированный документ.",
    }),
  ).toHaveAttribute("aria-busy", "false");
  await expect(diagram).toContainText("Читай схему слева направо");
  await expect(diagram).toContainText(
    "Markdown хранит структуру отдельно от оформления.",
  );

  const firstCheckOption = page.getByRole("radio").first();
  for (let step = 0; step < 30; step += 1) {
    const optionIsFocused = await firstCheckOption.evaluate(
      (option) => option === document.activeElement,
    );
    if (optionIsFocused) {
      break;
    }
    await page.keyboard.press("Tab");
  }
  await expect(firstCheckOption).toBeFocused();
});

test("Diagram opens a full-viewport viewer with zoom and restores focus", async ({
  page,
}) => {
  const diagram = page.getByRole("figure", {
    name: "Как Markdown становится страницей",
  });
  const openViewer = diagram.getByRole("button", {
    name: "Развернуть схему «Как Markdown становится страницей»",
  });
  await expect(openViewer).toBeEnabled();
  await openViewer.click();

  const viewer = page.getByRole("dialog", {
    name: "Развернутая схема «Как Markdown становится страницей»",
  });
  const closeViewer = viewer.getByRole("button", {
    name: "Закрыть развернутую схему",
  });
  await expect(viewer).toBeVisible();
  await expect(closeViewer).toBeFocused();
  await expect(
    viewer.getByRole("img", {
      name: "Содержание и знаки Markdown образуют исходник, который преобразователь превращает в структурированный документ.",
    }),
  ).toHaveAttribute("aria-busy", "false");

  const viewport = page.viewportSize();
  const viewerBox = await viewer.boundingBox();
  expect(viewport).not.toBeNull();
  expectBoxCloseTo(viewerBox, {
    x: 0,
    y: 0,
    width: viewport!.width,
    height: viewport!.height,
  });

  const resetZoom = viewer.getByRole("button", {
    name: /^Сбросить масштаб схемы/,
  });
  await expect(resetZoom).toContainText("100%");
  await viewer.getByRole("button", { name: "Увеличить схему" }).click();
  await expect(resetZoom).toContainText("125%");
  await page.keyboard.press("Shift+=");
  await expect(resetZoom).toContainText("150%");
  await page.keyboard.press("-");
  await expect(resetZoom).toContainText("125%");
  await page.keyboard.press("0");
  await expect(resetZoom).toContainText("100%");

  await viewer.getByText("Как читать схему", { exact: true }).click();
  await expect(viewer).toContainText(
    "Markdown хранит структуру отдельно от оформления.",
  );
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(openViewer).toBeFocused();

  await openViewer.click();
  await expect(resetZoom).toContainText("100%");
  await closeViewer.click();
  await expect(openViewer).toBeFocused();
});

test("Diagram viewer keeps its canvas usable at a narrow width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./courses/markdown/lessons/vvedenie/");

  const diagram = page.getByRole("figure", {
    name: "Как Markdown становится страницей",
  });
  const openViewer = diagram.getByRole("button", {
    name: "Развернуть схему «Как Markdown становится страницей»",
  });
  await expect(openViewer).toBeVisible();
  await openViewer.click();

  const viewer = page.getByRole("dialog", {
    name: "Развернутая схема «Как Markdown становится страницей»",
  });
  const viewerBox = await viewer.boundingBox();
  expectBoxCloseTo(viewerBox, { width: 390, height: 844 });
  await expect(
    viewer.getByRole("toolbar", { name: "Масштаб схемы" }),
  ).toBeVisible();

  const zoomIn = viewer.getByRole("button", { name: "Увеличить схему" });
  await zoomIn.click();
  await zoomIn.click();
  const canvasViewport = viewer.locator("[data-diagram-dialog-viewport]");
  expect(
    await canvasViewport.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  await expectNoPageOverflow(page, 390);
});

test("canonical Chart exposes review evidence, table fallback, and provenance", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/review/");

  const chart = page.getByRole("figure", {
    name: "Проблемы учебной инструкции по этапам проверки",
  });
  await expect(
    chart.getByRole("img", {
      name: "Число найденных проблем структуры и точности уменьшается от черновика к самопроверке и проверке коллегой.",
    }),
  ).toBeVisible();
  await expect(
    chart.getByRole("definition").filter({ hasText: "Этап (этап)" }),
  ).toBeVisible();
  await expect(
    chart
      .getByRole("definition")
      .filter({ hasText: "Число найденных проблем (проблема)" }),
  ).toBeVisible();

  const table = chart.getByRole("table", {
    name: "Данные: Проблемы учебной инструкции по этапам проверки",
  });
  await expect(table.getByRole("columnheader")).toHaveText([
    "Этап (этап)",
    "Структура (проблема)",
    "Точность (проблема)",
  ]);
  await expect(
    table.getByRole("row", { name: "Проверка коллегой 1 1" }),
  ).toBeVisible();
  await expect(chart).toContainText(
    "После самопроверки остаются четыре проблемы",
  );
  await expect(
    chart.getByRole("link", {
      name: "Смоделированный журнал проверки в исходнике этого Урока",
    }),
  ).toHaveAttribute(
    "href",
    "https://github.com/bsafronov/prosto-courses/blob/main/src/content/courses/markdown/modules/proverka/lessons/review.mdx",
  );
});

test("Chart exposes its visual, axes, legend, exact data, and provenance", async ({
  page,
}) => {
  await page.goto("./courses/accessible-images/lessons/describe-purpose/");

  const chart = page.getByRole("figure", {
    name: "Average published and reviewed lessons per editor",
  });
  await expect(chart).toBeVisible();
  const visual = chart.getByRole("img", {
    name: "Average published and reviewed lesson counts per editor are compared for June and July.",
  });
  await expect(visual).toBeVisible();
  for (const text of [
    "June",
    "July",
    "1: 1.001",
    "2: 1.002",
    "1: 3.003",
    "2: 2.002",
  ]) {
    await expect(visual.getByText(text, { exact: true })).toBeVisible();
  }
  await expect(
    chart.getByRole("definition").filter({ hasText: "Month (month)" }),
  ).toBeVisible();
  await expect(
    chart
      .getByRole("definition")
      .filter({ hasText: "Average lessons per editor (lesson)" }),
  ).toBeVisible();

  const legend = chart.getByRole("list", { name: "Легенда графика" });
  await expect(legend).toContainText("Published");
  await expect(legend).toContainText("Reviewed");

  const table = chart.getByRole("table", {
    name: "Данные: Average published and reviewed lessons per editor",
  });
  await expect(table.getByRole("columnheader")).toHaveText([
    "Month (month)",
    "Published (lesson)",
    "Reviewed (lesson)",
  ]);
  await expect(
    table.getByRole("row", { name: "June 1.001 1.002" }),
  ).toBeVisible();
  await expect(
    table.getByRole("row", { name: "July 3.003 2.002" }),
  ).toBeVisible();
  await expect(chart).toContainText(
    "Reviews kept pace in June but lagged behind publishing in July.",
  );
  await expect(
    chart.getByRole("link", {
      name: "Simulated dataset in this lesson source",
    }),
  ).toHaveAttribute(
    "href",
    "https://github.com/bsafronov/prosto-courses/blob/main/tests/fixtures/valid-course/accessible-images/modules/alt-text/lessons/describe-purpose.mdx",
  );
});

test("canonical Chart overflow regions are keyboard reachable", async ({ page }) => {
  await page.goto("./courses/markdown/lessons/review/");

  const chart = page.getByRole("figure", {
    name: "Проблемы учебной инструкции по этапам проверки",
  });
  const visual = chart.getByRole("img");
  const tableRegion = chart.getByRole("region", {
    name: "Таблица данных: Проблемы учебной инструкции по этапам проверки",
  });

  for (let step = 0; step < 40; step += 1) {
    const visualIsFocused = await visual.evaluate(
      (element) => element === document.activeElement,
    );
    if (visualIsFocused) break;
    await page.keyboard.press("Tab");
  }
  await expect(visual).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(tableRegion).toBeFocused();
});

test("sourced images expose alternative text, caption, provenance, and illustrative status", async ({
  page,
}) => {
  await page.goto("./courses/accessible-images/lessons/describe-purpose/");

  const figure = page.getByRole("figure", {
    name: "Illustrative context label used to test sourced-image alternatives.",
  });
  await expect(
    figure.getByRole("img", { name: "A red and blue rectangle labeled Context" }),
  ).toBeVisible();
  await expect(figure).toContainText("Generated platform fixture");
  await expect(figure).toContainText("Course-owned");
  await expect(figure).toContainText(
    "Иллюстративное сгенерированное изображение.",
  );
});

for (const theme of Object.keys(visualThemes) as VisualTheme[]) {
  const colors = visualThemes[theme];
  for (const viewport of [
    { name: "320px", width: 320, height: 800 },
    { name: "desktop", width: 1280, height: 900 },
  ] as const) {
    test(`Learning Visuals keep ${theme} semantic presentation at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("./courses/markdown/lessons/vvedenie/");
      await selectTheme(page, theme);

      const diagram = page.getByRole("figure", {
        name: "Как Markdown становится страницей",
      });
      const diagramTitle = diagram.locator("figcaption");
      const diagramVisual = diagram.getByRole("img");
      await expect(diagram).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(diagram).toHaveCSS("box-shadow", "none");
      await expect(diagramTitle).toHaveCSS("font-family", /Onest/);
      await expect(diagramTitle).toHaveCSS("font-size", "20px");
      await expect(diagramTitle).toHaveCSS("font-weight", "600");
      await expect(diagramTitle).toHaveCSS("border-bottom-color", colors.border);
      await expect(diagram.locator("svg text").first()).toHaveCSS(
        "font-family",
        /Onest/,
      );
      await expect(diagram.locator("svg text").first()).toHaveCSS(
        "font-size",
        "14px",
      );
      await expect(diagram.locator(".diagram-interpretation")).toHaveCSS(
        "font-size",
        "14px",
      );
      await diagramVisual.focus();
      await expect(diagramVisual).toHaveCSS("outline-color", colors.focus);
      await expectNoPageOverflow(page, viewport.width);

      await page.goto("./courses/accessible-images/lessons/describe-purpose/");
      await selectTheme(page, theme);

      const image = page.getByRole("figure", {
        name: "Illustrative context label used to test sourced-image alternatives.",
      });
      await expect(image).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(image).toHaveCSS("box-shadow", "none");
      await expect(image.locator("figcaption")).toHaveCSS("font-size", "14px");
      await expect(image.locator("figcaption")).toHaveCSS("color", colors.muted);
      await expect(image.locator(".provenance")).toHaveCSS("font-size", "12px");
      await expect(image.getByRole("img")).toHaveCSS(
        "border-top-color",
        colors.muted,
      );

      const chart = page.getByRole("figure", {
        name: "Average published and reviewed lessons per editor",
      });
      const chartTitle = chart.locator("figcaption");
      const chartVisual = chart.getByRole("img");
      await expect(chart).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(chart).toHaveCSS("box-shadow", "none");
      await expect(chartTitle).toHaveCSS("font-family", /Onest/);
      await expect(chartTitle).toHaveCSS("font-size", "20px");
      await expect(chartTitle).toHaveCSS("font-weight", "600");
      await expect(chart.locator(".chart-tick-label").first()).toHaveCSS(
        "font-size",
        "12px",
      );
      await expect(chart.locator(".chart-value-label").first()).toHaveCSS(
        "font-weight",
        "600",
      );
      await expect(chart.locator(".chart-axis-label").first()).toHaveCSS(
        "font-size",
        "14px",
      );
      await expect(chart.locator(".chart-axes dd").first()).toHaveCSS(
        "font-size",
        "14px",
      );
      await expect(chart.locator(".chart-legend")).toHaveCSS(
        "font-size",
        "14px",
      );
      await expect(chart.locator(".chart-interpretation")).toHaveCSS(
        "font-size",
        "14px",
      );
      await expect(chart.locator(".chart-grid-line").first()).toHaveCSS(
        "stroke",
        colors.border,
      );
      await expect(chart.locator(".chart-axis-line")).toHaveCSS(
        "stroke",
        colors.ink,
      );
      await chartVisual.focus();
      await expect(chartVisual).toHaveCSS("outline-color", colors.focus);
      await expectNoPageOverflow(page, viewport.width);
    });
  }

  test(`Learning Visuals reflow at 200% text zoom with long labels in ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("./courses/markdown/lessons/vvedenie/");
    await selectTheme(page, theme);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    const diagram = page.getByRole("figure", {
      name: "Как Markdown становится страницей",
    });
    await expect(diagram.locator("figcaption")).toBeVisible();
    await expect(diagram.getByText(/Содержание и знаки Markdown/)).toBeVisible();
    const diagramLabels = await svgTextLayout(
      diagram.locator("[data-mermaid-container] svg"),
      "text",
    );
    expect(diagramLabels.outside).toEqual([]);
    expect(diagramLabels.overlaps).toEqual([]);
    await expectNoPageOverflow(page, 320);

    await page.goto("./courses/accessible-images/lessons/describe-purpose/");
    await selectTheme(page, theme);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    const image = page.getByRole("figure", {
      name: "Illustrative context label used to test sourced-image alternatives.",
    });
    const chart = page.getByRole("figure", {
      name: "Average published and reviewed lessons per editor",
    });
    await expect(image.locator("figcaption")).toBeVisible();
    await expect(
      chart
        .getByRole("definition")
        .filter({ hasText: "Average lessons per editor (lesson)" }),
    ).toBeVisible();
    await expect(
      chart.getByRole("list", { name: "Легенда графика" }),
    ).toBeVisible();
    const renderedLabels = await svgTextLayout(
      chart.locator("svg"),
      ".chart-axis-label, .chart-category-label, .chart-value-label",
      ".chart-value-label",
    );
    expect(renderedLabels.outside).toEqual([]);
    expect(renderedLabels.overlaps).toEqual([]);
    await expectNoPageOverflow(page, 320);
  });
}

test("semantic visuals remain usable at a narrow width and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });

  const diagram = page.getByRole("figure", {
    name: "Как Markdown становится страницей",
  });
  await expect(diagram.getByRole("img")).toHaveAttribute("aria-busy", "false");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  expect(
    await diagram.evaluate(() =>
      document
        .getAnimations()
        .some((animation) => animation.playState === "running"),
    ),
  ).toBe(false);

  await page.goto("./courses/accessible-images/lessons/describe-purpose/");
  const chart = page.getByRole("figure", {
    name: "Average published and reviewed lessons per editor",
  });
  const chartVisual = chart.getByRole("img");
  await expect(chartVisual).toBeVisible();
  expect(
    await chartVisual.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  await expect(
    chart.getByRole("region", {
      name: "Таблица данных: Average published and reviewed lessons per editor",
    }),
  ).toBeVisible();

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);

  await page.goto("./courses/markdown/lessons/review/");
  const canonicalChart = page.getByRole("figure", {
    name: "Проблемы учебной инструкции по этапам проверки",
  });
  await expect(canonicalChart.getByRole("img")).toBeVisible();
  await expect(
    canonicalChart.getByRole("region", {
      name: "Таблица данных: Проблемы учебной инструкции по этапам проверки",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
