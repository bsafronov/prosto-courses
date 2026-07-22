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

test("learner reads the first Lesson from the Course Catalog", async (
  { page },
  testInfo,
) => {
  await expect(page).toHaveTitle(/Course Catalog/);
  const card = page.getByRole("article", { name: "Основы Markdown" });
  await expect(card).toContainText("Научитесь оформлять");

  await card.getByRole("link", { name: "Основы Markdown", exact: true }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("heading", { level: 1, name: "Основы Markdown" }),
  ).toBeVisible();
  await expect(page.getByText("Научитесь оформлять понятные документы")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Learning outcomes" })).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Создавать заголовки" }),
  ).toBeVisible();
  await expectLessonSequence(page, "Course lessons");

  await page.getByRole("link", { name: "Start course" }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/lessons\/vvedenie\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Знакомство с Markdown" }),
  ).toBeVisible();
  await expect(
    page.getByText("Markdown — это лёгкий язык разметки."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "All courses" })).toHaveAttribute(
    "href",
    new URL(testInfo.project.use.baseURL!).pathname,
  );
  await page.getByRole("link", { name: /Next Lesson/ }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/lessons\/formatting\/$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Course navigation" })).toBeVisible();
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
  await expectLessonSequence(page, "Course lessons", [
    "1Describe the image purpose",
    "2Edit for clarity",
  ]);

  await page.getByRole("link", { name: "Start course" }).click();
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

  await expectLessonSequence(page, "Course navigation lessons");
  await expect(page.getByText("Lesson 1 of 3", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Знакомство с Markdown/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: /Previous Lesson/ })).toHaveCount(0);

  await page.getByRole("link", { name: /Next Lesson: Заголовки/ }).click();

  await expectLessonSequence(page, "Course navigation lessons");
  await expect(page.getByText("Lesson 2 of 3", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Заголовки, выделение и списки/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("link", { name: /Previous Lesson: Знакомство/ }),
  ).toHaveAttribute("href", /\/lessons\/vvedenie\/$/);

  await page.setViewportSize({ width: 390, height: 844 });
  const courseNavigation = page.getByRole("navigation", {
    name: "Course navigation",
  });
  const navigationToggle = page.getByText(
    "Основы Markdown: Course lessons",
    { exact: true },
  );
  await navigationToggle.click();
  await expect(courseNavigation).not.toBeVisible();
  await navigationToggle.click();
  await expect(courseNavigation).toBeVisible();

  await page.getByRole("link", { name: /Next Lesson: Ссылки и код/ }).click();

  await expectLessonSequence(page, "Course navigation lessons");
  await expect(page.getByText("Lesson 3 of 3", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ссылки и код/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: /Next Lesson/ })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Back to Course Overview →" }),
  ).toHaveAttribute("href", /\/courses\/markdown\/$/);
});
