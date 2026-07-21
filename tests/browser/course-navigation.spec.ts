import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/prosto-courses/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("learner reads the first Lesson from the Course Catalog", async ({
  page,
}) => {
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
  await expect(
    page.getByRole("list", { name: "Course lessons" }).getByRole("link"),
  ).toHaveText([
    "1Знакомство с Markdown○Not started",
    "2Заголовки, выделение и списки○Not started",
    "3Ссылки и код○Not started",
  ]);

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
    "/prosto-courses/",
  );
  await page.getByRole("link", { name: /Next Lesson/ }).click();
  await expect(page).toHaveURL(/\/courses\/markdown\/lessons\/formatting\/$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Course navigation" })).toBeVisible();
});
