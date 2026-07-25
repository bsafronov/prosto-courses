import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./courses/markdown/lessons/vvedenie/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("single-choice Knowledge Check announces response-specific feedback and allows keyboard retries", async ({
  page,
}) => {
  const check = page.locator("[data-knowledge-check]");
  const feedback = check.locator("[data-feedback]");
  await expect(check.getByText("Проверь себя", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(feedback).toHaveAttribute("role", "status");
  await expect(feedback).toHaveAttribute("aria-live", "polite");
  await expect(feedback).toHaveAttribute("aria-atomic", "true");

  const incorrect = check.getByRole("radio", {
    name: "Он требует подключения базы данных",
  });
  await incorrect.focus();
  await page.keyboard.press("Space");
  await check.getByRole("button", { name: "Проверить ответ" }).focus();
  await page.keyboard.press("Enter");
  await expect(feedback).toContainText("Почти! Попробуй ещё раз.");
  await expect(feedback).toContainText(
    "База данных для Markdown не нужна",
  );
  await expect(feedback).toContainText("Символы Markdown просты");

  const correct = check.getByRole("radio", {
    name: "Он остаётся читаемым без специального редактора",
  });
  await correct.focus();
  await page.keyboard.press("Space");
  await check.getByRole("button", { name: "Проверить ответ" }).press("Enter");
  await expect(feedback).toContainText("Верно!");
  await expect(feedback).toContainText(
    "простые символы Markdown показывают структуру",
  );
  await expect(feedback).toContainText("Символы Markdown просты");
  await expect(feedback).not.toContainText(
    "База данных для Markdown не нужна",
  );
  await expect(check).not.toContainText(/балл|оценк/i);

  await expect(
    page.locator("header").getByLabel("Статус урока: В процессе"),
  ).toBeVisible();
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("multiple-choice Knowledge Check diagnoses every chosen response and supports keyboard revision", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/links-code/");
  const check = page.locator("[data-knowledge-check]");
  const feedback = check.locator("[data-feedback]");
  const linkText = check.getByRole("checkbox", {
    name: "Текст в квадратных скобках",
  });
  const destination = check.getByRole("checkbox", {
    name: "Адрес в круглых скобках",
  });
  const headingMarker = check.getByRole("checkbox", {
    name: "Символ # перед ссылкой",
  });

  await linkText.focus();
  await page.keyboard.press("Space");
  await destination.focus();
  await page.keyboard.press("Space");
  await check.getByRole("button", { name: "Проверить ответ" }).press("Enter");
  await expect(feedback).toContainText("Верно!");
  await expect(feedback).toContainText(
    "этот текст объясняет читателю назначение ссылки",
  );
  await expect(feedback).toContainText(
    "круглые скобки после текста содержат адрес перехода",
  );
  await expect(feedback).toContainText(
    "Markdown-ссылка объединяет понятный текст",
  );

  await destination.focus();
  await page.keyboard.press("Space");
  await headingMarker.focus();
  await page.keyboard.press("Space");
  await check.getByRole("button", { name: "Проверить ответ" }).press("Enter");
  await expect(feedback).toContainText("Почти! Попробуй ещё раз.");
  await expect(feedback).toContainText(
    "этот текст объясняет читателю назначение ссылки",
  );
  await expect(feedback).toContainText(
    "Символ # создаёт заголовок",
  );
  await expect(feedback).not.toContainText(
    "круглые скобки после текста содержат адрес перехода",
  );
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("Knowledge Check answers and feedback are cleared without persisting answer history", async ({
  page,
}) => {
  const check = page.locator("[data-knowledge-check]");
  const storedStateBeforeAnswer = await page.evaluate(() => ({ ...localStorage }));
  await check
    .getByRole("radio", {
      name: "Он остаётся читаемым без специального редактора",
    })
    .check();
  await check.getByRole("button", { name: "Проверить ответ" }).click();
  await expect(check.locator("[data-feedback]")).toContainText("Верно!");
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(
    storedStateBeforeAnswer,
  );

  await page.reload();

  await expect(
    page.locator("[data-knowledge-check] [data-feedback]"),
  ).toBeHidden();
  await expect(
    page.locator("[data-knowledge-check] input:checked"),
  ).toHaveCount(0);
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("Russian example Course includes Knowledge Checks in multiple Lessons", async ({
  page,
}) => {
  await expect(page.locator("[data-knowledge-check]")).toHaveCount(1);

  await page.goto("./courses/markdown/lessons/formatting/");

  await expect(page.locator("[data-knowledge-check]")).toHaveCount(1);
  await expect(
    page.getByText("Какая запись создаёт заголовок второго уровня?"),
  ).toBeVisible();
});
