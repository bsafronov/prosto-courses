import { expect, test, type Page } from "@playwright/test";

const lessonSequence = [
  "1Знакомство с Markdown",
  "2Заголовки, выделение и списки",
  "3Ссылки и код",
];

async function expectLessonSequence(
  page: Page,
  label: string,
  sequence = lessonSequence,
) {
  await expect(
    page.getByRole("list", { name: label }).getByRole("link"),
  ).toContainText(sequence);
}

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("learner traverses the complete Course tree from Catalog to Capstone", async ({
  page,
}) => {
  await page
    .getByRole("article", { name: "Основы Markdown" })
    .getByRole("link", { name: "Основы Markdown", exact: true })
    .click();

  await page.getByRole("link", { name: "Понятный Markdown-документ" }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/modules\/osnovy\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Понятный Markdown-документ" }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Знакомство с Markdown/ }).first().click();
  await expect(page).toHaveURL(/\/courses\/markdown\/lessons\/vvedenie\/$/);

  await page.getByRole("link", { name: /Следующий урок: Заголовки/ }).click();
  await page.getByRole("link", { name: /Следующий урок: Ссылки и код/ }).click();
  await page.getByRole("link", { name: /Перейти к проверке Модуля/ }).click();
  await expect(page).toHaveURL(
    /\/courses\/markdown\/modules\/osnovy\/checkpoint\/$/,
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Собери Markdown-памятку",
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Перейти к итоговой работе/ }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/capstone\/$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Понятная инструкция в Markdown",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Критерии готовности" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Критерии итоговой работы" })
      .getByRole("listitem"),
  ).toContainText([
    "Назначение Markdown объяснено",
    "Инструкция разделена заголовками",
    "Ссылки и фрагменты кода записаны однозначно",
  ]);
});

test("learner reads the first Lesson from the Course Catalog", async (
  { page },
  testInfo,
) => {
  await expect(page).toHaveTitle(/Каталог курсов/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Учись новому — урок за уроком.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Все курсы" })).toHaveAttribute(
    "href",
    new URL(testInfo.project.use.baseURL!).pathname,
  );
  const card = page.getByRole("article", { name: "Основы Markdown" });
  await expect(card).toContainText("Научись оформлять");

  await card.getByRole("link", { name: "Основы Markdown", exact: true }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("heading", { level: 1, name: "Основы Markdown" }),
  ).toBeVisible();
  await expect(page.getByText("Научись оформлять понятные документы")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Чему ты научишься" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Создавать заголовки" }),
  ).toBeVisible();
  await expectLessonSequence(page, "Уроки курса");

  await page.getByRole("link", { name: "Начать курс" }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/lessons\/vvedenie\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Знакомство с Markdown" }),
  ).toBeVisible();
  await expect(
    page.getByText("Markdown — это лёгкий язык разметки."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Все курсы" })).toHaveAttribute(
    "href",
    new URL(testInfo.project.use.baseURL!).pathname,
  );
  await page.getByRole("link", { name: /Следующий урок/ }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/lessons\/formatting\/$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("navigation", { name: "Навигация по курсу" }),
  ).toBeVisible();
});

test("fresh authoring fixture follows the Catalog-to-Lesson path", async ({
  page,
}) => {
  const card = page.getByRole("article", { name: "Writing useful alt text" });
  await expect(card).toContainText("Write concise image descriptions");

  await card
    .getByRole("link", { name: "Writing useful alt text", exact: true })
    .click();
  await expect(page).toHaveURL(/\/courses\/accessible-images\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Writing useful alt text" }),
  ).toBeVisible();
  await expectLessonSequence(page, "Уроки курса", [
    "1Describe the image purpose",
    "2Edit for clarity",
  ]);

  await page.getByRole("link", { name: "Начать курс" }).click();
  await expect(page).toHaveURL(
    /\/courses\/accessible-images\/lessons\/describe-purpose\/$/,
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Describe the image purpose" }),
  ).toBeVisible();
});

test("learner follows the complete Lesson sequence", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/vvedenie/");

  await expectLessonSequence(page, "Уроки в навигации курса");
  await expect(page.getByText("Урок 1 из 3", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Знакомство с Markdown/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: /Предыдущий урок/ })).toHaveCount(0);

  await page.getByRole("link", { name: /Следующий урок: Заголовки/ }).click();

  await expectLessonSequence(page, "Уроки в навигации курса");
  await expect(page.getByText("Урок 2 из 3", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Заголовки, выделение и списки/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("link", { name: /Предыдущий урок: Знакомство/ }),
  ).toHaveAttribute("href", /\/lessons\/vvedenie\/$/);

  await page.setViewportSize({ width: 390, height: 844 });
  const courseNavigation = page.getByRole("navigation", {
    name: "Навигация по курсу",
  });
  const navigationToggle = page.getByText(
    "Основы Markdown: уроки курса",
    { exact: true },
  );
  await navigationToggle.click();
  await expect(courseNavigation).not.toBeVisible();
  await navigationToggle.click();
  await expect(courseNavigation).toBeVisible();

  await page.getByRole("link", { name: /Следующий урок: Ссылки и код/ }).click();

  await expectLessonSequence(page, "Уроки в навигации курса");
  await expect(page.getByText("Урок 3 из 3", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ссылки и код/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: /Следующий урок/ })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Перейти к проверке Модуля/ }),
  ).toHaveAttribute("href", /\/courses\/markdown\/modules\/osnovy\/checkpoint\/$/);
});
