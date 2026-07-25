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

  await page.reload();
  await expect(
    page.locator('[data-knowledge-check][data-type="multiple"] input:checked'),
  ).toHaveCount(0);
  await expect(
    page.locator(
      '[data-knowledge-check][data-type="multiple"] [data-feedback]',
    ),
  ).toBeHidden();
});

test("matching Knowledge Check shuffles opaque values and supports keyboard retries", async ({
  page,
}) => {
  await page.goto("./courses/accessible-images/lessons/describe-purpose/");
  const check = page.locator('[data-knowledge-check][data-type="matching"]');
  const feedback = check.locator("[data-feedback]");
  const context = check.getByRole("combobox", {
    name: "Соответствие для «Surrounding context»",
  });
  const alternativeText = check.getByRole("combobox", {
    name: "Соответствие для «Alternative text»",
  });
  const fileName = check.getByRole("combobox", {
    name: "Соответствие для «File name»",
  });

  const presentedOptions = await context
    .locator("option:not([value=''])")
    .evaluateAll((options) =>
      options.map((option) => ({
        text: option.textContent,
        value: (option as HTMLOptionElement).value,
      })),
    );
  const optionValues = presentedOptions.map((option) => option.value);
  expect(optionValues).not.toEqual([
    "surrounding-context",
    "alternative-text",
    "file-name",
  ]);
  expect(presentedOptions.map((option) => option.text)).not.toEqual([
    "Identifies the information the image contributes",
    "Communicates that information without the image",
    "Identifies the stored asset",
  ]);
  expect(new Set(presentedOptions.map((option) => option.text))).toEqual(
    new Set([
      "Identifies the information the image contributes",
      "Communicates that information without the image",
      "Identifies the stored asset",
    ]),
  );

  async function chooseWithKeyboard(
    select: typeof context,
    label: string,
  ) {
    const optionIndex = await select.locator("option").evaluateAll(
      (options, target) =>
        options.findIndex(
          (option) => (option as HTMLOptionElement).label === target,
        ),
      label,
    );
    expect(optionIndex).toBeGreaterThan(0);
    await select.focus();
    await page.keyboard.type(label);
    await page.keyboard.press("Tab");
    await expect(select).toHaveValue(
      await select.locator("option").nth(optionIndex).getAttribute("value") ?? "",
    );
  }

  await chooseWithKeyboard(
    context,
    "Communicates that information without the image",
  );
  await chooseWithKeyboard(
    alternativeText,
    "Identifies the information the image contributes",
  );
  await chooseWithKeyboard(fileName, "Identifies the stored asset");
  await check.getByRole("button", { name: "Проверить ответ" }).press("Enter");
  await expect(feedback).toContainText("Почти! Попробуй ещё раз.");
  await expect(feedback).toContainText(
    "Context determines the image's purpose.",
  );

  await chooseWithKeyboard(
    context,
    "Identifies the information the image contributes",
  );
  await chooseWithKeyboard(
    alternativeText,
    "Communicates that information without the image",
  );
  await check.getByRole("button", { name: "Проверить ответ" }).press("Enter");
  await expect(feedback).toContainText("Верно!");
  await expect(feedback).toContainText(
    "The image's context establishes its purpose",
  );
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.reload();
  await expect(
    page.locator(
      '[data-knowledge-check][data-type="matching"] select option:checked',
    ),
  ).toHaveText([
    "Выбери соответствие",
    "Выбери соответствие",
    "Выбери соответствие",
  ]);
  await expect(
    page.locator('[data-knowledge-check][data-type="matching"] [data-feedback]'),
  ).toBeHidden();
});

test("ordering Knowledge Check announces keyboard moves and allows retries", async ({
  page,
}) => {
  await page.goto("./courses/accessible-images/lessons/describe-purpose/");
  const check = page.locator('[data-knowledge-check][data-type="ordering"]');
  const list = check.locator("[data-ordering-list]");
  const feedback = check.locator("[data-feedback]");
  const authoredOrder = [
    "Inspect the surrounding context",
    "Identify the image's purpose",
    "Write an equivalent description",
  ];

  const initialRows = await list.locator("[data-ordering-item]").evaluateAll(
    (rows) =>
      rows.map((row) => ({
        key: (row as HTMLElement).dataset.orderKey,
        text: row.querySelector("[data-ordering-text]")?.textContent,
      })),
  );
  expect(initialRows.map((row) => row.text)).not.toEqual(authoredOrder);
  expect(initialRows.map((row) => row.key)).not.toEqual([
    "inspect-context",
    "identify-purpose",
    "write-equivalent",
  ]);

  await check.getByRole("button", { name: "Проверить ответ" }).press("Enter");
  await expect(feedback).toContainText("Почти! Попробуй ещё раз.");

  for (const [desiredIndex, text] of authoredOrder.entries()) {
    const row = list
      .locator("[data-ordering-item]")
      .filter({ hasText: text });
    let currentIndex = await row.evaluate((item) =>
      [...(item.parentElement?.children ?? [])].indexOf(item),
    );
    while (currentIndex > desiredIndex) {
      await row
        .getByRole("button", { name: `Переместить «${text}» выше` })
        .press("Enter");
      currentIndex -= 1;
    }
  }
  await expect(check.locator("[data-ordering-announcement]")).toContainText(
    /позиция \d из 3/,
  );
  await expect(list.locator("[data-ordering-text]")).toHaveText(authoredOrder);

  await check.getByRole("button", { name: "Проверить ответ" }).press("Enter");
  await expect(feedback).toContainText("Верно!");
  await expect(feedback).toContainText("Context and purpose come before wording.");
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.reload();
  await expect(
    page.locator('[data-knowledge-check][data-type="ordering"] [data-feedback]'),
  ).toBeHidden();
});

test("exact Knowledge Check applies declared normalization and clears on reload", async ({
  page,
}) => {
  await page.goto("./courses/accessible-images/lessons/describe-purpose/");
  const check = page.locator('[data-knowledge-check][data-type="exact"]');
  const answer = check.getByRole("textbox", { name: "Ответ" });
  const feedback = check.locator("[data-feedback]");

  await answer.focus();
  await page.keyboard.type("title");
  await page.keyboard.press("Enter");
  await expect(feedback).toContainText("Почти! Попробуй ещё раз.");

  await answer.fill("");
  await answer.focus();
  await page.keyboard.type("  ALT  ");
  await page.keyboard.press("Enter");
  await expect(feedback).toContainText("Верно!");
  await expect(feedback).toContainText(
    "HTML images use the alt attribute for their text alternative.",
  );
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.reload();
  const reloaded = page.locator(
    '[data-knowledge-check][data-type="exact"]',
  );
  await expect(reloaded.getByRole("textbox", { name: "Ответ" })).toHaveValue("");
  await expect(reloaded.locator("[data-feedback]")).toBeHidden();
});

test("numeric Knowledge Check applies tolerance, exposes its unit, and allows retry", async ({
  page,
}) => {
  await page.goto("./courses/accessible-images/lessons/describe-purpose/");
  const check = page.locator('[data-knowledge-check][data-type="numeric"]');
  const answer = check.getByRole("spinbutton", {
    name: "Ответ, единица: characters",
  });
  const feedback = check.locator("[data-feedback]");
  await expect(check.getByText("characters", { exact: true })).toBeVisible();

  await answer.focus();
  await page.keyboard.type("4");
  await page.keyboard.press("Enter");
  await expect(feedback).toContainText("Почти! Попробуй ещё раз.");

  await answer.fill("");
  await answer.focus();
  await page.keyboard.type("3.2");
  await page.keyboard.press("Enter");
  await expect(feedback).toContainText("Верно!");
  await expect(feedback).toContainText(
    "The attribute name is written as three characters: alt.",
  );
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.reload();
  const reloaded = page.locator(
    '[data-knowledge-check][data-type="numeric"]',
  );
  await expect(
    reloaded.getByRole("spinbutton", {
      name: "Ответ, единица: characters",
    }),
  ).toHaveValue("");
  await expect(reloaded.locator("[data-feedback]")).toBeHidden();
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
