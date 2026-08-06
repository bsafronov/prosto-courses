import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./courses/markdown/");
});

test("Course Overview explains the promise and derived workload", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { level: 2, name: "Для кого этот курс" }),
  ).toBeVisible();
  await expect(page.getByText(/Для тех, кто пишет рабочие заметки/)).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Что нужно уметь" }),
  ).toBeVisible();
  await expect(
    page.getByText("Создавать и сохранять текстовый файл"),
  ).toBeVisible();

  const workload = page.getByRole("group", { name: "Объём курса" });
  await expect(workload).toContainText("3 модуля");
  await expect(workload).toContainText("6 уроков");
  await expect(workload).toContainText("3 ч 55 мин");
});

test("Course Overview shows factual verification and its derived freshness state", async ({
  page,
}) => {
  const freshness = page.getByRole("group", {
    name: "Актуальность материалов",
  });
  await expect(freshness).toContainText(/Проверено\s*25 июля 2026 г\./);
  await expect(freshness).toContainText("Актуально до");
  await expect(freshness).toContainText(
    "CommonMark 0.31.2, GitHub Flavored Markdown 0.29-gfm и GitHub.com",
  );
  await expect(freshness).toContainText("25 января 2027 г.");
  await expect(freshness).not.toContainText(/изменен|обновлен/i);

  await page.goto("./courses/accessible-images/");
  const staleFreshness = page.getByRole("group", {
    name: "Актуальность материалов",
  });
  await expect(staleFreshness).toContainText(
    /Проверено\s*23 июля 2026 г\./,
  );
  await expect(staleFreshness).toContainText(
    /Юрисдикция\s*WCAG 2\.2 SC 1\.1\.1/,
  );
  await expect(staleFreshness).toContainText(
    "Требуется повторная проверка",
  );
  await expect(staleFreshness).toContainText("29 августа 2026 г.");

  await page.goto("./courses/accessible-images/modules/alt-text/");
  const moduleFreshness = page.getByRole("group", {
    name: "Актуальность материалов",
  });
  await expect(moduleFreshness).toContainText("Требуется повторная проверка");
  await expect(moduleFreshness).toContainText(/Проверено\s*23 июля 2026 г\./);
  await expect(moduleFreshness).toContainText(/Юрисдикция\s*WCAG 2\.2 SC 1\.1\.1/);
});

test("Module Overview explains its capability, outcomes, and derived workload", async ({
  page,
}) => {
  await page.getByRole("link", { name: "От исходника к структуре" }).click();

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Что ты сможешь после модуля",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Читать Markdown-исходник и предсказывать его смысловую структуру после преобразования",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Какие результаты поддерживает модуль",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Объяснять, как разметка Markdown превращает исходный текст в структурированный документ",
    ),
  ).toBeVisible();

  const workload = page.getByRole("group", { name: "Объём модуля" });
  await expect(workload).toContainText("2 урока");
  await expect(workload).toContainText("50 мин");
  await expect(
    page.getByRole("link", {
      name: "Объясни путь от исходника к документу →",
      exact: true,
    }),
  ).toBeVisible();
});

test("Lesson page separates capability and time estimates", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/vvedenie/");

  await expect(
    page.getByText("Объяснять роль разметки и создавать простой Markdown-файл"),
  ).toBeVisible();
  const workload = page.getByRole("group", { name: "Время на урок" });
  await expect(workload).toContainText("Изучение8 мин");
  await expect(workload).toContainText("Практика7 мин");
  await expect(workload).toContainText("Дополнительно0 мин");

  await page.goto("./courses/accessible-images/lessons/edit-for-clarity/");
  const optionalWorkload = page.getByRole("group", { name: "Время на урок" });
  await expect(optionalWorkload).toContainText("Изучение5 мин");
  await expect(optionalWorkload).toContainText("Практика5 мин");
  await expect(optionalWorkload).not.toContainText("Дополнительно");
});

test("Course and Module routes present non-blocking Progression Guidance", async ({
  page,
}) => {
  await expect(
    page.getByText(/рекомендуемая последовательность/i),
  ).toBeVisible();
  await expect(
    page.getByText(/можно открыть любую часть курса/i),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Маршрут курса" })
    .getByRole("link", { name: /Где Markdown перестаёт быть одинаковым/ })
    .click();
  await expect(page).toHaveURL(/\/lessons\/portability\/$/);

  await page.goto("./courses/markdown/modules/osnovy/");
  await expect(
    page.getByText(/рекомендуемая последовательность/i),
  ).toBeVisible();
  await expect(page.getByText(/не ограничивает переходы/i)).toBeVisible();
  await page
    .getByRole("navigation", { name: "Навигация по курсу" })
    .getByRole("link", { name: /Как читать Markdown-исходник/ })
    .click();
  await expect(page).toHaveURL(/\/lessons\/source-render\/$/);
});

test("promise and navigation remain readable at a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("group", { name: "Объём курса" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Маршрут курса" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);

  await page.getByRole("link", { name: "От исходника к структуре" }).click();
  await expect(page.getByRole("group", { name: "Объём модуля" })).toBeVisible();
  await page
    .getByRole("button", { name: "Открыть маршрут курса" })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Навигация по курсу" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
