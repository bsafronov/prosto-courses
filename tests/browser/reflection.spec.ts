import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const lessonPath = "./courses/markdown/lessons/formatting/";
const prompt =
  "Как изменился бы твой способ оформлять заметку после этого урока?";

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(lessonPath);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("Reflection keeps private-note controls readable in both themes", async ({
  page,
}) => {
  const reflection = page.getByRole("region", { name: prompt });
  const note = reflection.getByRole("textbox", { name: "Твоя заметка" });
  const copy = reflection.getByRole("button", { name: "Копировать" });
  const deleteNote = reflection.getByRole("button", {
    name: "Удалить навсегда",
  });

  for (const [theme, surface, muted, border, error] of [
    [
      "light",
      "rgb(255, 255, 255)",
      "rgb(113, 113, 122)",
      "rgb(228, 228, 231)",
      "rgb(161, 40, 40)",
    ],
    [
      "dark",
      "rgb(24, 24, 27)",
      "rgb(161, 161, 170)",
      "rgb(39, 39, 42)",
      "rgb(240, 154, 154)",
    ],
  ] as const) {
    await page
      .getByRole("combobox", { name: "Тема оформления" })
      .selectOption(theme);

    await expect(reflection).toHaveCSS("background-color", surface);
    await expect(reflection).toHaveCSS("border-top-width", "1px");
    await expect(copy).toHaveCSS("opacity", "1");
    await expect(copy).toHaveCSS("cursor", "not-allowed");
    await expect(deleteNote).toHaveCSS(
      "border-left-color",
      "rgba(0, 0, 0, 0)",
    );
    await expect(deleteNote).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await expect(deleteNote).toHaveCSS("opacity", "1");
    await expect(deleteNote).toHaveCSS("color", muted);

    await note.fill("Проверить опасное действие");
    await expect(deleteNote).toBeEnabled();
    await expect(deleteNote).toHaveCSS("color", error);
    await expect(deleteNote).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await deleteNote.hover();
    await expect(deleteNote).toHaveCSS(
      "background-color",
      border,
    );
    await page.mouse.move(0, 0);
    await note.fill("");

    await note.focus();
    await expect(note).toBeFocused();
    await expect(note).toHaveCSS("outline-style", "solid");
    await expect(note).toHaveCSS("outline-width", "2px");
  }
});

test("Reflection keeps a private draft across reloads without affecting completion", async ({
  page,
}) => {
  const reflection = page.getByRole("region", { name: prompt });
  const note = reflection.getByRole("textbox", { name: "Твоя заметка" });
  const draft = "Сначала наметить заголовки, а затем писать детали.";

  await expect(reflection).toContainText(
    "Текст остаётся только в этом браузере и никуда не отправляется.",
  );
  await note.fill(draft);
  await expect(reflection.getByRole("status")).toContainText(
    "Черновик сохранён в этом браузере.",
  );

  await page.reload();

  await expect(
    page
      .getByRole("region", { name: prompt })
      .getByRole("textbox", { name: "Твоя заметка" }),
  ).toHaveValue(draft);
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(
    page.locator("[data-knowledge-check] input:checked"),
  ).toHaveCount(0);
  const checkFeedback = page.locator(
    "[data-knowledge-check] [data-feedback]",
  );
  await expect(checkFeedback).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    await expect(checkFeedback.nth(index)).toBeHidden();
  }
  expect(
    await page.evaluate((reflectionText) => {
      const progress = localStorage.getItem("prosto-courses:progress:v1") ?? "";
      return progress.includes(reflectionText);
    }, draft),
  ).toBe(false);
});

test("Reflection copy, export, and permanent deletion work from the keyboard", async ({
  page,
}) => {
  const reflection = page.getByRole("region", { name: prompt });
  const note = reflection.getByRole("textbox", { name: "Твоя заметка" });
  const draft = "Буду проверять, соответствует ли уровень заголовка структуре.";

  await note.focus();
  await page.keyboard.type(draft);

  const copy = reflection.getByRole("button", { name: "Копировать" });
  await copy.focus();
  await page.keyboard.press("Enter");
  await expect(reflection.getByRole("status")).toContainText(
    "Заметка скопирована.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(draft);

  const downloadPromise = page.waitForEvent("download");
  await reflection
    .getByRole("button", { name: "Экспортировать" })
    .press("Enter");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^reflection-\d{4}-\d{2}-\d{2}\.txt$/,
  );
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(await readFile(downloadPath!, "utf8")).toBe(`${prompt}\n\n${draft}\n`);
  await expect(reflection.getByRole("status")).toContainText(
    "Файл с заметкой скачан.",
  );

  const deleteNote = reflection.getByRole("button", {
    name: "Удалить навсегда",
  });
  await deleteNote.focus();
  await page.keyboard.press("Enter");
  await expect(note).toBeFocused();
  await expect(note).toHaveValue("");
  await expect(deleteNote).toBeDisabled();
  await expect(reflection.getByRole("status")).toContainText(
    "Заметка навсегда удалена из этого браузера.",
  );

  await page.reload();
  await expect(
    page
      .getByRole("region", { name: prompt })
      .getByRole("textbox", { name: "Твоя заметка" }),
  ).toHaveValue("");
});

test("Reflection content is absent from every network request", async ({
  page,
}) => {
  const draft =
    "PRIVATE_REFLECTION_MARKER: сначала определить структуру документа.";
  const leakedRequests: string[] = [];
  page.on("request", (request) => {
    const requestData = `${request.url()}\n${request.postData() ?? ""}`;
    if (requestData.includes(draft)) leakedRequests.push(requestData);
  });

  const reflection = page.getByRole("region", { name: prompt });
  await reflection.getByRole("textbox", { name: "Твоя заметка" }).fill(draft);
  await reflection.getByRole("button", { name: "Копировать" }).click();
  const downloadPromise = page.waitForEvent("download");
  await reflection.getByRole("button", { name: "Экспортировать" }).click();
  await downloadPromise;
  await page.reload();

  expect(leakedRequests).toEqual([]);
});
