import { expect, test } from "@playwright/test";

const lessonPath = "./courses/markdown/lessons/formatting/";
const taskTitle = "Собери структуру заметки";

test.beforeEach(async ({ page }) => {
  await page.goto(lessonPath);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("Practice Task keeps its activity inside one bounded work area", async ({
  page,
}) => {
  const task = page.getByRole("region", { name: taskTitle });
  const prompt = task.locator("[data-task-prompt]");

  await expect(task).toHaveCSS("border-top-width", "1px");
  await expect(task).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(prompt).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(prompt).toHaveCSS("border-top-width", "1px");
  await expect(prompt).toHaveCSS("border-left-width", "0px");
  await expect(prompt).toHaveCSS("border-right-width", "0px");
  await expect(prompt).toHaveCSS("border-radius", "0px");
});

test("Practice Task reveals authored hints progressively from the keyboard", async ({
  page,
}) => {
  const task = page.getByRole("region", { name: taskTitle });
  const hints = task.getByRole("list", { name: "Открытые подсказки" });
  const reveal = task.getByRole("button", {
    name: "Показать подсказку 1 из 2",
  });

  await expect(task).toContainText("Основная практика");
  await expect(task).toContainText("10 мин");
  await expect(hints.getByRole("listitem")).toHaveCount(0);

  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(hints.getByRole("listitem")).toHaveText([
    "Сначала назови главные части заметки.",
  ]);
  await expect(
    task.getByRole("button", { name: "Показать подсказку 2 из 2" }),
  ).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(hints.getByRole("listitem")).toHaveText([
    "Сначала назови главные части заметки.",
    "Преобразуй каждую главную часть в заголовок второго уровня.",
  ]);
  await expect(
    task.getByRole("button", { name: "Все подсказки открыты" }),
  ).toBeDisabled();
});

test("Practice Task feedback is deliberately revealed without a hint or answer gate", async ({
  page,
}) => {
  const task = page.getByRole("region", { name: taskTitle });
  const solution = task.getByRole("group", { name: "Разбор решения" });

  await expect(
    task.getByRole("list", { name: "Открытые подсказки" }).getByRole("listitem"),
  ).toHaveCount(0);
  await expect(solution.getByText("Сначала выделены смысловые части")).toBeHidden();

  const revealSolution = solution.getByText("Показать разбор решения", {
    exact: true,
  });
  await revealSolution.focus();
  await page.keyboard.press("Enter");

  await expect(solution.getByText("Сначала выделены смысловые части")).toBeVisible();
  await expect(solution).toContainText("Другой подход");
  await expect(solution).toContainText("Вероятные ошибки");
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page
    .getByRole("button", { name: "Завершить урок" })
    .press("Enter");
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("open Practice Task uses observable Self-Assessment without a score", async ({
  page,
}) => {
  await page.goto("./courses/markdown/capstone/");
  const task = page.getByRole("region", {
    name: "Создай и проверь рабочую инструкцию",
  });
  const rubric = task.getByRole("group", { name: "Самопроверка" });

  await expect(rubric.getByText("Разметка выражает смысл")).toBeHidden();
  await rubric.getByText("Открыть критерии самопроверки").press("Enter");
  await expect(rubric.getByText("Разметка выражает смысл")).toBeVisible();
  await expect(rubric).toContainText(
    "Автор может объяснить роль заголовков, списков, ссылок и кода",
  );
  await expect(rubric).not.toContainText(/балл|оценк|score|points/i);
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("interactive work areas remain usable at narrow widths with reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();

  const task = page.getByRole("region", { name: taskTitle });
  const reflection = page.getByRole("region", {
    name: "Как изменился бы твой способ оформлять заметку после этого урока?",
  });
  const surfaces = [
    page.locator("[data-knowledge-check]").first(),
    task,
    reflection,
    page.getByRole("region", { name: "Завершение урока" }),
  ];

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const surface of surfaces) {
    const box = await surface.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }

  const hint = task.getByRole("button", {
    name: "Показать подсказку 1 из 2",
  });
  await hint.focus();
  await page.keyboard.press("Enter");
  await expect(task.getByText("Сначала назови главные части заметки.")).toBeVisible();

  const note = reflection.getByRole("textbox", { name: "Твоя заметка" });
  await note.focus();
  await page.keyboard.type("Локальная заметка");
  await expect(note).toHaveValue("Локальная заметка");

  const completion = page.locator("[data-completion-toggle]");
  await completion.focus();
  await expect(completion).toBeFocused();
});
