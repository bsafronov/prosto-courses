import { expect, test } from "@playwright/test";

const courseOverview = "/prosto-courses/courses/markdown/";

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

test("Course action becomes Review course after every Lesson is complete", async ({ page }) => {
  await page.getByRole("link", { name: "Start course" }).click();
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "Mark Lesson complete" }).click();
    if (index < 2) await page.getByRole("link", { name: /Next Lesson/ }).click();
  }
  await page.getByRole("link", { name: "Course Overview", exact: true }).click();
  await expect(page.getByRole("link", { name: "Review course" })).toHaveAttribute(
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
