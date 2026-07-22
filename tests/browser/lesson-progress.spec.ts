import { expect, test, type Page } from "@playwright/test";

const courseOverview = "./courses/markdown/";

async function expectThreeProgressStates(page: Page, listName: string) {
  const lessons = page.getByRole("list", { name: listName });
  const completed = lessons
    .getByRole("link", { name: /Знакомство с Markdown/ })
    .getByLabel("Статус урока: Завершён");
  const started = lessons
    .getByRole("link", { name: /Заголовки, выделение и списки/ })
    .getByLabel("Статус урока: В процессе");
  const notStarted = lessons
    .getByRole("link", { name: /Ссылки и код/ })
    .getByLabel("Статус урока: Не начат");

  await expect(completed).toContainText("✓");
  await expect(completed).toHaveCSS("background-color", "rgb(216, 243, 223)");
  await expect(started).toContainText("◐");
  await expect(started).toHaveCSS("background-color", "rgb(255, 241, 168)");
  await expect(notStarted).toContainText("○");
}

async function completeEveryLesson(page: Page) {
  await page.getByRole("link", { name: "Начать курс" }).click();
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "Завершить урок" }).click();
    if (index < 2) await page.getByRole("link", { name: /Следующий урок/ }).click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto(courseOverview);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("Lesson Progress persists, resumes the latest incomplete Lesson, and remains reversible", async ({
  page,
}) => {
  const action = page.getByRole("link", { name: "Начать курс" });
  await expect(action).toHaveAttribute("href", /\/lessons\/vvedenie\/$/);
  await action.click();

  const currentStatus = page.locator("header").getByLabel("Статус урока: В процессе");
  await expect(currentStatus).toContainText("◐");
  const completion = page.locator("[data-completion-toggle]");
  await expect(completion).toHaveAttribute("aria-pressed", "false");
  await completion.click();
  await expect(page.locator("header").getByLabel("Статус урока: Завершён")).toContainText("✓");
  await expect(completion).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.locator("header").getByLabel("Статус урока: Завершён")).toBeVisible();
  await page.getByRole("button", { name: "Вернуть в работу" }).click();
  await expect(page.locator("header").getByLabel("Статус урока: В процессе")).toBeVisible();

  await page.getByRole("link", { name: /Следующий урок/ }).click();
  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  const continueAction = page.getByRole("link", { name: "Продолжить курс" });
  await expect(continueAction).toHaveAttribute("href", /\/lessons\/formatting\/$/);
});

test("Course Overview refreshes Lesson Progress after browser back navigation", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await expect(
    page.locator("header").getByLabel("Статус урока: В процессе"),
  ).toBeVisible();

  await page.goBack();

  const lessons = page.getByRole("list", { name: "Уроки курса" });
  await expect(
    lessons.getByRole("link", { name: /Знакомство с Markdown/ }),
  ).toContainText("В процессе");
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );
});

test("restored Lesson refreshes progress from browser-local storage", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await expect(
    page.locator("header").getByLabel("Статус урока: В процессе"),
  ).toBeVisible();
  await page.evaluate(() => {
    const key = "prosto-courses:progress:v1";
    const progress = JSON.parse(localStorage.getItem(key)!);
    progress.courses.markdown.lessons.formatting = {
      state: "started",
      visitedAt: Date.now() + 1,
    };
    localStorage.setItem(key, JSON.stringify(progress));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });

  const lessons = page.getByRole("list", { name: "Уроки в навигации курса" });
  await expect(
    lessons.getByRole("link", { name: /Заголовки, выделение и списки/ }),
  ).toContainText("В процессе");
});

test("Lesson navigation refreshes progress after browser back navigation", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("link", { name: /Следующий урок/ }).click();

  await page.goBack();

  const lessons = page.getByRole("list", { name: "Уроки в навигации курса" });
  await expect(
    lessons.getByRole("link", { name: /Заголовки, выделение и списки/ }),
  ).toContainText("В процессе");
});

test("Course navigation stays consistent across pages in the same browser", async ({
  page,
  context,
}) => {
  const lessons = page.getByRole("list", { name: "Уроки курса" });
  const firstLesson = lessons.getByRole("link", {
    name: /Знакомство с Markdown/,
  });
  await expect(
    firstLesson.getByLabel("Статус урока: Не начат"),
  ).toContainText("○");

  const lessonPage = await context.newPage();
  await lessonPage.goto(
    "./courses/markdown/lessons/vvedenie/",
  );

  await expect(
    firstLesson.getByLabel("Статус урока: В процессе"),
  ).toContainText("◐");
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );

  await lessonPage.getByRole("button", { name: "Завершить урок" }).click();

  await expect(
    firstLesson.getByLabel("Статус урока: Завершён"),
  ).toContainText("✓");
});

test("every Lesson has consistent accessible status on both navigation surfaces", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page.getByRole("link", { name: /Следующий урок/ }).click();

  await expectThreeProgressStates(page, "Уроки в навигации курса");

  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await expectThreeProgressStates(page, "Уроки курса");
});

test("Lesson Progress survives title, order, and content edits at stable slugs", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();

  await page.route("**/courses/markdown/lessons/vvedenie/", async (route) => {
    const response = await route.fetch();
    const editedLesson = (await response.text())
      .replaceAll("Знакомство с Markdown", "Обновлённое введение")
      .replace("Урок 1 из 3", "Урок 2 из 3")
      .replace(
        "Markdown — это лёгкий язык разметки.",
        "Обновлённое содержание урока.",
      );
    await route.fulfill({ response, body: editedLesson });
  });
  await page.reload();

  await expect(
    page.getByRole("heading", { level: 1, name: "Обновлённое введение" }),
  ).toBeVisible();
  await expect(page.getByText("Урок 2 из 3", { exact: true })).toBeVisible();
  await expect(page.getByText("Обновлённое содержание урока.")).toBeVisible();
  await expect(
    page.locator("header").getByLabel("Статус урока: Завершён"),
  ).toContainText("✓");
  await expect(
    page.getByRole("button", { name: "Вернуть в работу" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("Course action becomes the review action after every Lesson is complete", async ({ page }) => {
  await completeEveryLesson(page);
  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await expect(page.getByRole("link", { name: "Освежить знания" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );
});

test("marking a Lesson incomplete changes the review action back to continue", async ({
  page,
}) => {
  await completeEveryLesson(page);

  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await page.getByRole("link", { name: "Освежить знания" }).click();
  await page.getByRole("button", { name: "Вернуть в работу" }).click();
  await page.getByRole("link", { name: "О курсе", exact: true }).click();

  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );
});

test("continue action falls back to the first incomplete Lesson", async ({ page }) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/formatting\/$/,
  );
});

test("completing the latest Lesson resumes the previously visited incomplete Lesson", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("link", { name: /Следующий урок/ }).click();
  await page.getByRole("link", { name: /Следующий урок/ }).click();
  await page.locator('a[href$="/lessons/vvedenie/"]').first().click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/links-code\/$/,
  );
});
