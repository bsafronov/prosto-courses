import { expect, test } from "@playwright/test";

const lessonPath = "./courses/markdown/lessons/formatting/";
const taskTitle = "Собери структуру заметки";

test.beforeEach(async ({ page }) => {
  await page.goto(lessonPath);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
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
    name: "Проверь итоговую инструкцию",
  });
  const rubric = task.getByRole("group", { name: "Самопроверка" });

  await expect(rubric.getByText("Назначение понятно")).toBeHidden();
  await rubric.getByText("Открыть критерии самопроверки").press("Enter");
  await expect(rubric.getByText("Назначение понятно")).toBeVisible();
  await expect(rubric).toContainText(
    "Читатель может своими словами объяснить, зачем документ существует",
  );
  await expect(rubric).not.toContainText(/балл|оценк|score|points/i);
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
