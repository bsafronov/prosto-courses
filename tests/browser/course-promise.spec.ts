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
  await expect(page.getByText(/Для тех, кто пишет заметки/)).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Что нужно уметь" }),
  ).toBeVisible();
  await expect(
    page.getByText("Создавать и сохранять текстовый файл"),
  ).toBeVisible();

  const workload = page.getByRole("group", { name: "Объём курса" });
  await expect(workload).toContainText("1 Модуль");
  await expect(workload).toContainText("3 Урока");
  await expect(workload).toContainText("1 ч 30 мин");
});

test("Course Overview shows factual verification and its derived freshness state", async ({
  page,
}) => {
  const freshness = page.getByRole("group", {
    name: "Актуальность материалов",
  });
  await expect(freshness).toContainText(/Проверено\s*22 июля 2026 г\./);
  await expect(freshness).toContainText("Стабильные сведения");
  await expect(freshness).not.toContainText(/изменен|обновлен/i);

  await page.goto("./courses/accessible-images/");
  const staleFreshness = page.getByRole("group", {
    name: "Актуальность материалов",
  });
  await expect(staleFreshness).toContainText(
    /Проверено\s*22 июля 2026 г\./,
  );
  await expect(staleFreshness).toContainText(
    /Юрисдикция\s*Международные рекомендации по доступности/,
  );
  await expect(staleFreshness).toContainText(
    "Требуется повторная проверка",
  );
  await expect(staleFreshness).toContainText("22 октября 2026 г.");

  await page.goto("./courses/accessible-images/modules/alt-text/");
  await expect(
    page.getByRole("group", { name: "Актуальность материалов" }),
  ).toContainText("Требуется повторная проверка");
});

test("Module Overview explains its capability, outcomes, and derived workload", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Понятный Markdown-документ" }).click();

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Что ты сможешь после Модуля",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Создавать короткий структурированный Markdown-документ"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Какие результаты поддерживает Модуль",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Различать обычный текст и разметку Markdown"),
  ).toBeVisible();

  const workload = page.getByRole("group", { name: "Объём Модуля" });
  await expect(workload).toContainText("3 Урока");
  await expect(workload).toContainText("1 ч 5 мин");
  await expect(
    page.getByRole("link", { name: "Собери Markdown-памятку →", exact: true }),
  ).toBeVisible();
});

test("Lesson page separates capability and time estimates", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/vvedenie/");

  await expect(
    page.getByText("Объяснять роль разметки и создавать простой Markdown-файл"),
  ).toBeVisible();
  const workload = page.getByRole("group", { name: "Время на Урок" });
  await expect(workload).toContainText("Изучение8 мин");
  await expect(workload).toContainText("Практика7 мин");
  await expect(workload).toContainText("Дополнительно0 мин");

  await page.goto("./courses/accessible-images/lessons/edit-for-clarity/");
  const optionalWorkload = page.getByRole("group", { name: "Время на Урок" });
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
    .getByRole("link", { name: /Ссылки и код/ })
    .click();
  await expect(page).toHaveURL(/\/lessons\/links-code\/$/);

  await page.goto("./courses/markdown/modules/osnovy/");
  await expect(
    page.getByText(/рекомендуемая последовательность/i),
  ).toBeVisible();
  await expect(page.getByText(/не ограничивает переходы/i)).toBeVisible();
  await page
    .getByRole("navigation", { name: "Навигация по курсу" })
    .getByRole("link", { name: /Ссылки и код/ })
    .click();
  await expect(page).toHaveURL(/\/lessons\/links-code\/$/);
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

  await page.getByRole("link", { name: "Понятный Markdown-документ" }).click();
  await expect(page.getByRole("group", { name: "Объём Модуля" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Навигация по курсу" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
