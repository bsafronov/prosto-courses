import { expect, test } from "@playwright/test";

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
  for (let step = 0; step < 20; step += 1) {
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
