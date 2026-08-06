import { expect, test, type Page } from "@playwright/test";

const firstModuleLessons = [
  "Знакомство с Markdown",
  "Как читать Markdown-исходник",
];

async function expectLessonSequence(
  page: Page,
  label: string,
  sequence = firstModuleLessons,
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

async function expectLearnerTraversesCompleteCourseSequence(page: Page) {
  await page
    .getByRole("article", { name: "Основы Markdown" })
    .getByRole("link", { name: "Основы Markdown", exact: true })
    .click();

  await page.getByRole("link", { name: "От исходника к структуре" }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/modules\/osnovy\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "От исходника к структуре" }),
  ).toBeVisible();

  await page
    .getByRole("list", { name: "Уроки модуля" })
    .getByRole("link", { name: /Знакомство с Markdown/ })
    .click();
  await expect(page).toHaveURL(/\/courses\/markdown\/lessons\/vvedenie\/$/);
  await page.getByRole("button", { name: "Завершить урок" }).click();

  await page.getByRole("link", { name: /Следующий урок: Как читать/ }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page.getByRole("link", { name: /Перейти к проверке модуля/ }).click();
  await expect(page).toHaveURL(
    /\/courses\/markdown\/modules\/osnovy\/checkpoint\/$/,
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Объясни путь от исходника к документу",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Завершить проверку модуля" })
    .click();

  await page.getByRole("link", { name: /Перейти к следующему модулю/ }).click();
  await page.getByRole("link", { name: "Начать модуль" }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page.getByRole("link", { name: /Следующий урок: Ссылки и код/ }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page.getByRole("link", { name: /Перейти к проверке модуля/ }).click();
  await page
    .getByRole("button", { name: "Завершить проверку модуля" })
    .click();
  await page.getByRole("link", { name: /Перейти к следующему модулю/ }).click();
  await page.getByRole("link", { name: "Начать модуль" }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page
    .getByRole("link", { name: /Следующий урок: Проверка инструкции/ })
    .click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page.getByRole("link", { name: /Перейти к проверке модуля/ }).click();
  await page
    .getByRole("button", { name: "Завершить проверку модуля" })
    .click();
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
    "Выбор разметки объяснён",
    "Инструкция ведёт конкретного читателя",
    "Ссылки и команды записаны однозначно",
    "Целевая среда названа",
  ]);
  await page
    .getByRole("button", { name: "Завершить итоговую работу" })
    .click();
  await page.getByRole("link", { name: /Вернуться к обзору курса/ }).click();
  await expect(page.getByRole("status", { name: "Прогресс курса" })).toHaveText(
    "✓ Курс завершён · 10 из 10 завершено",
  );
}

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "narrow", width: 390, height: 844 },
] as const) {
  test(`learner completes every core destination at ${viewport.name} width`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await expectLearnerTraversesCompleteCourseSequence(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
  });
}

test("server-rendered narrow Module exposes its visible Lesson link", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    javaScriptEnabled: false,
    serviceWorkers: "block",
    viewport: { width: 390, height: 844 },
  });
  const serverRenderedPage = await context.newPage();

  try {
    await serverRenderedPage.goto("./courses/markdown/modules/osnovy/");
    await serverRenderedPage
      .getByRole("link", { name: /Знакомство с Markdown/ })
      .first()
      .click({ timeout: 1_000 });
    await expect(serverRenderedPage).toHaveURL(
      /\/courses\/markdown\/lessons\/vvedenie\/$/,
    );
  } finally {
    await context.close();
  }
});

test("Module Overview bridges the previous Module Checkpoint to its first Lesson", async ({
  page,
}) => {
  await page.goto("./courses/markdown/modules/struktura/");

  const sequence = page.getByRole("navigation", {
    name: "Последовательность курса",
  });
  await expect(
    sequence.getByRole("link", {
      name: /Предыдущая проверка модуля: Объясни путь от исходника к документу/,
    }),
  ).toHaveAttribute(
    "href",
    /\/courses\/markdown\/modules\/osnovy\/checkpoint\/$/,
  );
  await expect(
    sequence.getByRole("link", {
      name: /Следующий урок: Заголовки, выделение и списки/,
    }),
  ).toHaveAttribute(
    "href",
    /\/courses\/markdown\/lessons\/formatting\/$/,
  );
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
      name: "Выбери курс и начни с первого урока.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Каталог" })).toHaveAttribute(
    "href",
    new URL(testInfo.project.use.baseURL!).pathname,
  );
  const card = page.getByRole("article", { name: "Основы Markdown" });
  await expect(card).toContainText("Научись создавать, проверять и улучшать");

  await card.getByRole("link", { name: "Основы Markdown", exact: true }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("heading", { level: 1, name: "Основы Markdown" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Научись создавать, проверять и улучшать рабочие инструкции/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Чему ты научишься" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({
      hasText: "Проектировать понятную структуру инструкции",
    }),
  ).toBeVisible();
  await expectLessonSequence(
    page,
    "Уроки курса: От исходника к структуре",
  );

  await page.getByRole("link", { name: "Начать" }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/lessons\/vvedenie\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Знакомство с Markdown" }),
  ).toBeVisible();
  await expect(
    page.getByText("Markdown — это лёгкий язык разметки."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Каталог" })).toHaveAttribute(
    "href",
    new URL(testInfo.project.use.baseURL!).pathname,
  );
  await page.getByRole("link", { name: /Следующий урок/ }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/lessons\/source-render\/$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Открыть маршрут курса" })
    .click();
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
    "Describe the image purpose",
    "Edit for clarity",
  ]);

  await page.getByRole("link", { name: "Начать" }).click();
  await expect(page).toHaveURL(
    /\/courses\/accessible-images\/lessons\/describe-purpose\/$/,
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Describe the image purpose" }),
  ).toBeVisible();
});

test("learner follows the complete first-Module Lesson sequence", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/vvedenie/");

  await expectLessonSequence(
    page,
    "Уроки в навигации курса: От исходника к структуре",
  );
  await expect(page.getByText("Урок 1 из 2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Знакомство с Markdown/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: /Предыдущий урок/ })).toHaveCount(0);

  await page.getByRole("link", { name: /Следующий урок: Как читать/ }).click();

  await expectLessonSequence(
    page,
    "Уроки в навигации курса: От исходника к структуре",
  );
  await expect(page.getByText("Урок 2 из 2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Как читать Markdown-исходник/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("link", { name: /Предыдущий урок: Знакомство/ }),
  ).toHaveAttribute("href", /\/lessons\/vvedenie\/$/);

  await page.setViewportSize({ width: 390, height: 844 });
  const courseNavigation = page.getByRole("navigation", {
    name: "Навигация по курсу",
  });
  const navigationToggle = page.getByRole("button", {
    name: "Открыть маршрут курса",
  });
  await expect(courseNavigation).toBeHidden();
  await navigationToggle.click();
  await expect(courseNavigation).toBeVisible();
  await page
    .getByRole("button", { name: "Закрыть маршрут курса" })
    .click();
  await expect(courseNavigation).toBeHidden();

  await expect(page.getByRole("link", { name: /Следующий урок/ })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Перейти к проверке модуля/ }),
  ).toHaveAttribute("href", /\/courses\/markdown\/modules\/osnovy\/checkpoint\/$/);
});
