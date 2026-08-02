import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./courses/markdown/lessons/vvedenie/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function moveOrderingItem(
  page: Page,
  list: Locator,
  text: string,
  desiredIndex: number,
) {
  const row = list.locator("[data-ordering-item]").filter({ hasText: text });
  let currentIndex = await row.evaluate((item) =>
    [...(item.parentElement?.children ?? [])].indexOf(item),
  );
  if (currentIndex === desiredIndex) return;

  await row.locator("[data-ordering-handle]").focus();
  await page.keyboard.press("Enter");
  await expect(row.locator("[data-ordering-handle]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const direction = currentIndex > desiredIndex ? "ArrowUp" : "ArrowDown";
  const step = currentIndex > desiredIndex ? -1 : 1;
  while (currentIndex !== desiredIndex) {
    await page.keyboard.press(direction);
    currentIndex += step;
    await expect
      .poll(() =>
        row.evaluate((item) =>
          [...(item.parentElement?.children ?? [])].indexOf(item),
        ),
      )
      .toBe(currentIndex);
  }
  await page.keyboard.press("Enter");
  await expect(row.locator("[data-ordering-handle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(row.locator("[data-ordering-handle]")).toBeFocused();
}

test("Knowledge Check uses one bounded work area with internally ruled options", async ({
  page,
}) => {
  const check = page.locator("[data-knowledge-check]");
  const options = check.locator(".options label");

  await expect(check).toHaveCSS("border-top-width", "1px");
  await expect(check).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(options).toHaveCount(3);

  for (const option of await options.all()) {
    await expect(option).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(option).toHaveCSS("border-left-width", "0px");
    await expect(option).toHaveCSS("border-right-width", "0px");
    await expect(option).toHaveCSS("border-radius", "0px");
  }
});

test("Knowledge Check feedback and ordering handles stay explicit in both themes", async ({
  page,
}) => {
  const check = page.locator("[data-knowledge-check]");
  const feedback = check.locator("[data-feedback]");

  await check
    .getByRole("radio", { name: "Он требует подключения базы данных" })
    .check();
  await check.getByRole("button", { name: "Проверить ответ" }).click();
  await expect(feedback).toContainText("Почти! Попробуй ещё раз.");

  for (const [theme, warning] of [
    ["light", "rgb(138, 90, 0)"],
    ["dark", "rgb(232, 187, 102)"],
  ] as const) {
    await page
      .getByRole("combobox", { name: "Тема оформления" })
      .selectOption(theme);
    await expect(feedback).toHaveCSS("color", warning);
    await expect(feedback).toHaveCSS("border-left-width", "2px");
  }

  await check
    .getByRole("radio", {
      name: "Он остаётся читаемым без специального редактора",
    })
    .check();
  await check.getByRole("button", { name: "Проверить ответ" }).click();
  await expect(feedback).toContainText("Верно!");
  await expect(feedback).toHaveCSS("color", "rgb(155, 212, 171)");

  await page.goto("./courses/markdown/lessons/formatting/");
  const handle = page
    .locator("[data-ordering-item]")
    .first()
    .locator("[data-ordering-handle]");
  const handleBox = await handle.boundingBox();
  const glyphBox = await handle.locator("svg").boundingBox();
  expect(handleBox).not.toBeNull();
  expect(handleBox).toMatchObject({ width: 36, height: 36 });
  expect(glyphBox).toMatchObject({ width: 18, height: 18 });
  await expect(handle).toHaveCSS("cursor", "grab");
  await expect(handle).toHaveCSS("touch-action", "none");
  await expect(handle).toHaveCSS("border-left-width", "1px");
  await expect(handle).toHaveCSS("border-left-color", "rgba(0, 0, 0, 0)");
  await expect(handle).toHaveAttribute(
    "aria-roledescription",
    "рукоятка сортировки",
  );
});

test("single-choice Knowledge Check announces response-specific feedback and allows keyboard retries", async ({
  page,
}) => {
  const check = page.locator("[data-knowledge-check]");
  const feedback = check.locator("[data-feedback]");
  await expect(check.getByText("Проверь себя", { exact: true })).toBeVisible();
  await expect(check.getByRole("status")).toHaveCount(1);
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
  expect(
    await page
      .locator(
        '[data-knowledge-check][data-type="matching"] select',
      )
      .first()
      .locator("option:not([value=''])")
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      ),
  ).toEqual(optionValues);
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
  await expect(
    check.getByText(
      "Перетащи шаги за рукоятку. Клавиатура: Enter или пробел — поднять, ↑/↓ — переместить, Enter или пробел — положить, Esc — отменить.",
    ),
  ).toBeVisible();
  await expect(list.locator("[data-ordering-position]")).toHaveText([
    "01",
    "02",
    "03",
  ]);
  await expect(
    check.getByRole("button", { name: /выше|ниже/i }),
  ).toHaveCount(0);

  await check.getByRole("button", { name: "Проверить ответ" }).press("Enter");
  await expect(feedback).toContainText("Почти! Попробуй ещё раз.");

  const boundaryText = await list
    .locator("[data-ordering-item]")
    .nth(1)
    .locator("[data-ordering-text]")
    .textContent();
  expect(boundaryText).not.toBeNull();
  const boundaryRow = list
    .locator("[data-ordering-item]")
    .filter({ hasText: boundaryText ?? "" });
  await moveOrderingItem(page, list, boundaryText ?? "", 0);
  await expect(boundaryRow.locator("[data-ordering-handle]")).toBeFocused();

  for (const [desiredIndex, text] of authoredOrder.entries()) {
    await moveOrderingItem(page, list, text, desiredIndex);
  }
  await expect(check.locator("[data-ordering-announcement]")).toContainText(
    /Позиция \d из 3/,
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
  const reloaded = page.locator(
    '[data-knowledge-check][data-type="ordering"]',
  );
  await expect(reloaded.locator("[data-feedback]")).toBeHidden();
  expect(
    await reloaded.locator("[data-ordering-text]").allTextContents(),
  ).not.toEqual(authoredOrder);
  expect(
    await reloaded.locator("[data-ordering-item]").evaluateAll((rows) =>
      rows.map((row) => (row as HTMLElement).dataset.orderKey),
    ),
  ).toEqual(initialRows.map((row) => row.key));
});

test("ordering Knowledge Check preserves scrolling and supports live touch reordering", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./courses/markdown/lessons/formatting/");
  const list = page.locator(
    '[data-knowledge-check][data-type="ordering"] [data-ordering-list]',
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });

  await list.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const textBox = await list
    .locator("[data-ordering-text]")
    .first()
    .boundingBox();
  expect(textBox).not.toBeNull();
  const textTouch = {
    x: textBox!.x + textBox!.width / 2,
    y: textBox!.y + textBox!.height / 2,
  };
  const scrollBefore = await page.evaluate(() => ({
    maximum: document.documentElement.scrollHeight - window.innerHeight,
    position: window.scrollY,
  }));
  const scrollDirection =
    scrollBefore.position < scrollBefore.maximum ? -1 : 1;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [textTouch],
  });
  for (let step = 1; step <= 4; step += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: textTouch.x,
          y: textTouch.y + scrollDirection * step * 20,
        },
      ],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .not.toBe(scrollBefore.position);
  await expect(page.locator("[data-ordering-item][data-dnd-dragging]")).toHaveCount(
    0,
  );

  await list.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const originalOrder = await list
    .locator("[data-ordering-text]")
    .allTextContents();
  const sourceHandle = list
    .locator("[data-ordering-item]")
    .first()
    .locator("[data-ordering-handle]");
  const targetRow = list.locator("[data-ordering-item]").last();
  const [sourceBox, targetBox] = await Promise.all([
    sourceHandle.boundingBox(),
    targetRow.boundingBox(),
  ]);
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  const source = {
    x: sourceBox!.x + sourceBox!.width / 2,
    y: sourceBox!.y + sourceBox!.height / 2,
  };
  const target = {
    x: targetBox!.x + targetBox!.width / 2,
    y: targetBox!.y + targetBox!.height / 2,
  };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [source],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: source.x, y: source.y + 5 }],
  });
  await expect(page.locator("[data-ordering-item][data-dnd-dragging]")).toHaveCount(
    0,
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: source.x, y: source.y + 8 }],
  });
  await expect(page.locator("[data-ordering-item][data-dnd-dragging]")).toHaveCount(
    1,
  );

  for (let step = 1; step <= 6; step += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: source.x + ((target.x - source.x) * step) / 6,
          y: source.y + ((target.y - source.y) * step) / 6,
        },
      ],
    });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
    );
  }

  await expect
    .poll(() =>
      list
        .locator(
          "[data-ordering-item]:not([data-dnd-dragging]) [data-ordering-text]",
        )
        .allTextContents(),
    )
    .not.toEqual(originalOrder);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator("[data-ordering-item][data-dnd-dragging]")).toHaveCount(
    0,
  );
  await expect(list.locator("[data-ordering-text]")).not.toHaveText(
    originalOrder,
  );
  await cdp.detach();
});

test("ordering Knowledge Check cancels keyboard moves without motion when requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./courses/markdown/lessons/formatting/");
  const check = page.locator(
    '[data-knowledge-check][data-type="ordering"]',
  );
  const list = check.locator("[data-ordering-list]");
  const initialOrder = await list
    .locator("[data-ordering-text]")
    .allTextContents();
  const rowText = initialOrder[1];
  const row = list
    .locator("[data-ordering-item]")
    .filter({ hasText: rowText });
  const handle = row.locator("[data-ordering-handle]");

  await handle.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");
  expect(
    await list
      .locator("[data-ordering-item]")
      .evaluateAll((rows) =>
        rows.reduce((total, item) => total + item.getAnimations().length, 0),
      ),
  ).toBe(0);
  await page.keyboard.press("Escape");

  await expect(list.locator("[data-ordering-text]")).toHaveText(initialOrder);
  await expect(check.locator("[data-ordering-announcement]")).toContainText(
    "Перемещение отменено.",
  );
  await expect(handle).toBeFocused();
});

test("ordering Knowledge Check requires an explicit keyboard drop or cancellation", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/formatting/");
  const check = page.locator(
    '[data-knowledge-check][data-type="ordering"]',
  );
  const list = check.locator("[data-ordering-list]");
  const initialOrder = await list
    .locator("[data-ordering-text]")
    .allTextContents();
  const rowText = initialOrder[1];
  const row = list
    .locator("[data-ordering-item]")
    .filter({ hasText: rowText });
  const handle = row.locator("[data-ordering-handle]");

  await handle.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Tab");

  await expect(handle).toHaveAttribute("aria-pressed", "true");
  await expect(handle).toHaveCSS("background-color", "rgb(228, 228, 231)");
  await expect(handle).toHaveCSS("color", "rgb(24, 24, 27)");
  await expect(list.locator("[data-ordering-text]")).not.toHaveText(
    initialOrder,
  );

  await handle.focus();
  await page.keyboard.press("Escape");
  await expect(handle).toHaveAttribute("aria-pressed", "false");
  await expect(list.locator("[data-ordering-text]")).toHaveText(initialOrder);
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
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("./courses/accessible-images/lessons/describe-purpose/");
  const check = page.locator('[data-knowledge-check][data-type="numeric"]');
  const answer = check.getByRole("spinbutton", {
    name: "Ответ, единица: characters",
  });
  const feedback = check.locator("[data-feedback]");
  await expect(check.getByText("characters", { exact: true })).toBeVisible();

  const [checkBox, answerBox, unitBox] = await Promise.all([
    check.boundingBox(),
    answer.boundingBox(),
    check.getByText("characters", { exact: true }).boundingBox(),
  ]);
  expect(checkBox).not.toBeNull();
  expect(answerBox).not.toBeNull();
  expect(unitBox).not.toBeNull();
  expect(answerBox!.x + answerBox!.width).toBeLessThanOrEqual(unitBox!.x);
  expect(unitBox!.x + unitBox!.width).toBeLessThanOrEqual(
    checkBox!.x + checkBox!.width,
  );

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

test("canonical Russian Course uses each response pattern its capabilities need", async ({
  page,
}) => {
  await expect(page.locator('[data-knowledge-check][data-type="single"]')).toHaveCount(1);

  await page.goto("./courses/markdown/lessons/source-render/");
  await expect(
    page.locator('[data-knowledge-check][data-type="matching"]'),
  ).toHaveCount(1);

  await page.goto("./courses/markdown/lessons/formatting/");

  await expect(page.locator("[data-knowledge-check]")).toHaveCount(2);
  await expect(
    page.locator('[data-knowledge-check][data-type="ordering"]'),
  ).toHaveCount(1);
  await expect(
    page.getByText("Какая запись создаёт заголовок второго уровня?"),
  ).toBeVisible();

  await page.goto("./courses/markdown/lessons/links-code/");
  await expect(
    page.locator('[data-knowledge-check][data-type="multiple"]'),
  ).toHaveCount(1);

  await page.goto("./courses/markdown/lessons/portability/");
  await expect(
    page.locator('[data-knowledge-check][data-type="exact"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-knowledge-check][data-type="ordering"]'),
  ).toHaveCount(1);

  await page.goto("./courses/markdown/lessons/review/");
  await expect(
    page.locator('[data-knowledge-check][data-type="single"]'),
  ).toHaveCount(1);
});

test("canonical matching focus plus keyboard ordering and exact response paths work", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/source-render/");
  const matching = page.locator(
    '[data-knowledge-check][data-type="matching"]',
  );
  for (const [left, right] of [
    ["## Проверка", "Блок-заголовок"],
    ["- Запусти тесты", "Пункт маркированного списка"],
    ["`pnpm test`", "Код внутри строки"],
  ]) {
    const select = matching.getByRole("combobox", {
      name: `Соответствие для «${left}»`,
    });
    const option = await select.locator("option").evaluateAll(
      (options, target) =>
        options
          .map((candidate, index) => ({
            index,
            label: (candidate as HTMLOptionElement).label,
            value: (candidate as HTMLOptionElement).value,
          }))
          .find((candidate) => candidate.label === target),
      right,
    );
    expect(option?.index).toBeGreaterThan(0);
    await select.focus();
    await expect(select).toBeFocused();
    await select.selectOption(option!.value);
    await expect(select).toHaveValue(option!.value);
    await select.press("Tab");
  }
  await matching
    .getByRole("button", { name: "Проверить ответ" })
    .press("Enter");
  await expect(matching.locator("[data-feedback]")).toContainText("Верно!");

  await page.goto("./courses/markdown/lessons/formatting/");
  const ordering = page.locator(
    '[data-knowledge-check][data-type="ordering"]',
  );
  const orderedTexts = [
    "Сформулировать результат читателя",
    "Сгруппировать связанные действия",
    "Назначить группам уровни заголовков",
    "Прочитать только заголовки и проверить логику",
  ];
  const orderingList = ordering.locator("[data-ordering-list]");
  for (const [desiredIndex, itemText] of orderedTexts.entries()) {
    await moveOrderingItem(page, orderingList, itemText, desiredIndex);
  }
  await ordering
    .getByRole("button", { name: "Проверить ответ" })
    .press("Enter");
  await expect(ordering.locator("[data-feedback]")).toContainText("Верно!");

  await page.goto("./courses/markdown/lessons/portability/");
  const exact = page.locator('[data-knowledge-check][data-type="exact"]');
  const answer = exact.getByRole("textbox", { name: "Ответ" });
  await answer.focus();
  await page.keyboard.type("  commonmark  ");
  await page.keyboard.press("Enter");
  await expect(exact.locator("[data-feedback]")).toContainText("Верно!");
});
