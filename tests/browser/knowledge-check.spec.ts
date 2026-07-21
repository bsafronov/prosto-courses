import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/prosto-courses/courses/markdown/lessons/vvedenie/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("Knowledge Check announces feedback, explains answers, and allows keyboard retries", async ({
  page,
}) => {
  const check = page.locator("[data-knowledge-check]");
  const feedback = check.locator("[data-feedback]");
  await expect(feedback).toHaveAttribute("aria-live", "polite");

  const incorrect = check.getByRole("radio", { name: "Он требует подключения базы данных" });
  await incorrect.focus();
  await page.keyboard.press("Space");
  await check.getByRole("button", { name: "Check answer" }).focus();
  await page.keyboard.press("Enter");
  await expect(feedback).toContainText("Not quite. Try again.");
  await expect(feedback).toContainText("Символы Markdown просты");

  const correct = check.getByRole("radio", {
    name: "Он остаётся читаемым без специального редактора",
  });
  await correct.focus();
  await page.keyboard.press("Space");
  await check.getByRole("button", { name: "Check answer" }).press("Enter");
  await expect(feedback).toContainText("Correct.");

  await expect(page.locator("header").getByLabel("Lesson status: Started")).toBeVisible();
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute("aria-pressed", "false");
});
