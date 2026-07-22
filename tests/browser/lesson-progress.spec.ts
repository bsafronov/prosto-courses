import { expect, test, type Page } from "@playwright/test";

const courseOverview = "./courses/markdown/";

async function expectThreeProgressStates(page: Page, listName: string) {
  const lessons = page.getByRole("list", { name: listName });
  const completed = lessons
    .getByRole("link", { name: /Знакомство с Markdown/ })
    .getByLabel("Lesson status: Completed");
  const started = lessons
    .getByRole("link", { name: /Заголовки, выделение и списки/ })
    .getByLabel("Lesson status: Started");
  const notStarted = lessons
    .getByRole("link", { name: /Ссылки и код/ })
    .getByLabel("Lesson status: Not started");

  await expect(completed).toContainText("✓");
  await expect(completed).toHaveCSS("background-color", "rgb(216, 243, 223)");
  await expect(started).toContainText("◐");
  await expect(started).toHaveCSS("background-color", "rgb(255, 241, 168)");
  await expect(notStarted).toContainText("○");
}

async function completeEveryLesson(page: Page) {
  await page.getByRole("link", { name: "Start course" }).click();
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "Mark Lesson complete" }).click();
    if (index < 2) await page.getByRole("link", { name: /Next Lesson/ }).click();
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
  const action = page.getByRole("link", { name: "Start course" });
  await expect(action).toHaveAttribute("href", /\/lessons\/vvedenie\/$/);
  await action.click();

  const currentStatus = page.locator("header").getByLabel("Lesson status: Started");
  await expect(currentStatus).toContainText("◐");
  const completion = page.locator("[data-completion-toggle]");
  await expect(completion).toHaveAttribute("aria-pressed", "false");
  await completion.click();
  await expect(page.locator("header").getByLabel("Lesson status: Completed")).toContainText("✓");
  await expect(completion).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.locator("header").getByLabel("Lesson status: Completed")).toBeVisible();
  await page.getByRole("button", { name: "Mark Lesson incomplete" }).click();
  await expect(page.locator("header").getByLabel("Lesson status: Started")).toBeVisible();

  await page.getByRole("link", { name: /Next Lesson/ }).click();
  await page.getByRole("link", { name: "Course Overview", exact: true }).click();
  const continueAction = page.getByRole("link", { name: "Continue course" });
  await expect(continueAction).toHaveAttribute("href", /\/lessons\/formatting\/$/);
});

test("Course Overview refreshes Lesson Progress after browser back navigation", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Start course" }).click();
  await expect(
    page.locator("header").getByLabel("Lesson status: Started"),
  ).toBeVisible();

  await page.goBack();

  const lessons = page.getByRole("list", { name: "Course lessons" });
  await expect(
    lessons.getByRole("link", { name: /Знакомство с Markdown/ }),
  ).toContainText("Started");
  await expect(page.getByRole("link", { name: "Continue course" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );
});

test("restored Lesson refreshes progress from browser-local storage", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Start course" }).click();
  await expect(
    page.locator("header").getByLabel("Lesson status: Started"),
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

  const lessons = page.getByRole("list", { name: "Course navigation lessons" });
  await expect(
    lessons.getByRole("link", { name: /Заголовки, выделение и списки/ }),
  ).toContainText("Started");
});

test("Lesson navigation refreshes progress after browser back navigation", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Start course" }).click();
  await page.getByRole("link", { name: /Next Lesson/ }).click();

  await page.goBack();

  const lessons = page.getByRole("list", { name: "Course navigation lessons" });
  await expect(
    lessons.getByRole("link", { name: /Заголовки, выделение и списки/ }),
  ).toContainText("Started");
});

test("Course navigation stays consistent across pages in the same browser", async ({
  page,
  context,
}) => {
  const lessons = page.getByRole("list", { name: "Course lessons" });
  const firstLesson = lessons.getByRole("link", {
    name: /Знакомство с Markdown/,
  });
  await expect(
    firstLesson.getByLabel("Lesson status: Not started"),
  ).toContainText("○");

  const lessonPage = await context.newPage();
  await lessonPage.goto(
    "./courses/markdown/lessons/vvedenie/",
  );

  await expect(
    firstLesson.getByLabel("Lesson status: Started"),
  ).toContainText("◐");
  await expect(page.getByRole("link", { name: "Continue course" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );

  await lessonPage.getByRole("button", { name: "Mark Lesson complete" }).click();

  await expect(
    firstLesson.getByLabel("Lesson status: Completed"),
  ).toContainText("✓");
});

test("every Lesson has consistent accessible status on both navigation surfaces", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Start course" }).click();
  await page.getByRole("button", { name: "Mark Lesson complete" }).click();
  await page.getByRole("link", { name: /Next Lesson/ }).click();

  await expectThreeProgressStates(page, "Course navigation lessons");

  await page.getByRole("link", { name: "Course Overview", exact: true }).click();
  await expectThreeProgressStates(page, "Course lessons");
});

test("Lesson Progress survives title, order, and content edits at stable slugs", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Start course" }).click();
  await page.getByRole("button", { name: "Mark Lesson complete" }).click();

  await page.route("**/courses/markdown/lessons/vvedenie/", async (route) => {
    const response = await route.fetch();
    const editedLesson = (await response.text())
      .replaceAll("Знакомство с Markdown", "Обновлённое введение")
      .replace("Lesson 1 of 3", "Lesson 2 of 3")
      .replace(
        "Markdown — это лёгкий язык разметки.",
        "Обновлённое содержание Lesson.",
      );
    await route.fulfill({ response, body: editedLesson });
  });
  await page.reload();

  await expect(
    page.getByRole("heading", { level: 1, name: "Обновлённое введение" }),
  ).toBeVisible();
  await expect(page.getByText("Lesson 2 of 3", { exact: true })).toBeVisible();
  await expect(page.getByText("Обновлённое содержание Lesson.")).toBeVisible();
  await expect(
    page.locator("header").getByLabel("Lesson status: Completed"),
  ).toContainText("✓");
  await expect(
    page.getByRole("button", { name: "Mark Lesson incomplete" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("Course action becomes Review course after every Lesson is complete", async ({ page }) => {
  await completeEveryLesson(page);
  await page.getByRole("link", { name: "Course Overview", exact: true }).click();
  await expect(page.getByRole("link", { name: "Review course" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );
});

test("marking a Lesson incomplete changes Review course back to Continue course", async ({
  page,
}) => {
  await completeEveryLesson(page);

  await page.getByRole("link", { name: "Course Overview", exact: true }).click();
  await page.getByRole("link", { name: "Review course" }).click();
  await page.getByRole("button", { name: "Mark Lesson incomplete" }).click();
  await page.getByRole("link", { name: "Course Overview", exact: true }).click();

  await expect(page.getByRole("link", { name: "Continue course" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );
});

test("Continue course falls back to the first incomplete Lesson", async ({ page }) => {
  await page.getByRole("link", { name: "Start course" }).click();
  await page.getByRole("button", { name: "Mark Lesson complete" }).click();
  await page.getByRole("link", { name: "Course Overview", exact: true }).click();
  await expect(page.getByRole("link", { name: "Continue course" })).toHaveAttribute(
    "href",
    /\/lessons\/formatting\/$/,
  );
});

test("completing the latest Lesson resumes the previously visited incomplete Lesson", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Start course" }).click();
  await page.getByRole("link", { name: /Next Lesson/ }).click();
  await page.getByRole("link", { name: /Next Lesson/ }).click();
  await page.locator('a[href$="/lessons/vvedenie/"]').first().click();
  await page.getByRole("button", { name: "Mark Lesson complete" }).click();
  await page.getByRole("link", { name: "Course Overview", exact: true }).click();
  await expect(page.getByRole("link", { name: "Continue course" })).toHaveAttribute(
    "href",
    /\/lessons\/links-code\/$/,
  );
});
