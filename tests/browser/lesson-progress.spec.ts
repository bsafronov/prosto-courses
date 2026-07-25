import { expect, test, type Page } from "@playwright/test";

const courseOverview = "./courses/markdown/";

async function expectThreeProgressStates(page: Page, listName: string) {
  const lessons = page.getByRole("list", { name: listName });
  const completed = lessons
    .getByRole("link", { name: /Знакомство с Markdown/ })
    .getByLabel("Статус урока: Завершён");
  const started = lessons
    .getByRole("link", { name: /Заголовки, выделение и списки/ })
    .getByLabel("Статус урока: В процессе");
  const notStarted = lessons
    .getByRole("link", { name: /Ссылки и код/ })
    .getByLabel("Статус урока: Не начат");

  await expect(completed).toContainText("✓");
  await expect(completed).toHaveCSS("background-color", "rgb(216, 243, 223)");
  await expect(started).toContainText("◐");
  await expect(started).toHaveCSS("background-color", "rgb(255, 241, 168)");
  await expect(notStarted).toContainText("○");
}

async function completeEveryLesson(page: Page) {
  await page.getByRole("link", { name: "Начать курс" }).click();
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "Завершить урок" }).click();
    if (index < 2) await page.getByRole("link", { name: /Следующий урок/ }).click();
  }
}

async function completeCoreRoute(page: Page) {
  await completeEveryLesson(page);
  await page.getByRole("link", { name: /Перейти к проверке Модуля/ }).click();
  await page.getByRole("button", {
    name: "Завершить проверку Модуля",
  }).click();
  await page.getByRole("link", { name: /Перейти к итоговой работе/ }).click();
  await page.getByRole("button", {
    name: "Завершить итоговую работу",
  }).click();
}

async function restoreLessonCompletion(
  page: Page,
  lessonSlug: string,
  completedRevision?: number,
) {
  await page.evaluate(
    ({ lessonSlug, completedRevision }) => {
      localStorage.setItem(
        "prosto-courses:progress:v1",
        JSON.stringify({
          courses: {
            markdown: {
              destinations: {
                [`lesson:${lessonSlug}`]: {
                  state: "completed",
                  visitedAt: 1,
                  ...(completedRevision === undefined
                    ? {}
                    : { completedRevision }),
                },
              },
            },
          },
        }),
      );
    },
    { lessonSlug, completedRevision },
  );
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await page.goto(courseOverview);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("Lesson Progress persists, resumes the latest incomplete Lesson, and remains reversible", async ({
  page,
}) => {
  const action = page.getByRole("link", { name: "Начать курс" });
  await expect(action).toHaveAttribute("href", /\/lessons\/vvedenie\/$/);
  await action.click();

  const currentStatus = page.locator("header").getByLabel("Статус урока: В процессе");
  await expect(currentStatus).toContainText("◐");
  const completion = page.locator("[data-completion-toggle]");
  await expect(completion).toHaveAttribute("aria-pressed", "false");
  await completion.click();
  await expect(page.locator("header").getByLabel("Статус урока: Завершён")).toContainText("✓");
  await expect(completion).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.locator("header").getByLabel("Статус урока: Завершён")).toBeVisible();
  await page.getByRole("button", { name: "Вернуть в работу" }).click();
  await expect(page.locator("header").getByLabel("Статус урока: В процессе")).toBeVisible();

  await page.getByRole("link", { name: /Следующий урок/ }).click();
  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  const continueAction = page.getByRole("link", { name: "Продолжить курс" });
  await expect(continueAction).toHaveAttribute("href", /\/lessons\/formatting\/$/);
});

test("Lesson Completion records the current Content Revision", async ({ page }) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();

  const completedRevision = await page.evaluate(() => {
    const progress = JSON.parse(
      localStorage.getItem("prosto-courses:progress:v1")!,
    );
    return progress.courses.markdown.destinations["lesson:vvedenie"]
      .completedRevision;
  });

  expect(completedRevision).toBe(1);
});

test("a higher Content Revision preserves completion and announces the update", async ({
  page,
}) => {
  await restoreLessonCompletion(page, "formatting", 1);

  const lesson = page
    .getByRole("list", { name: "Уроки курса" })
    .getByRole("link", { name: /Заголовки, выделение и списки/ });
  await expect(
    lesson.getByLabel("Статус урока: Завершён"),
  ).toBeVisible();
  await expect(
    lesson.getByText("Обновлён после завершения", { exact: true }),
  ).toBeVisible();
});

test("an updated Lesson offers a revisit without revoking completion", async ({
  page,
}) => {
  await restoreLessonCompletion(page, "formatting", 1);

  const revisit = page.getByRole("link", {
    name: "Пересмотреть обновлённый урок: Заголовки, выделение и списки",
  });
  await expect(revisit).toHaveAttribute(
    "href",
    /\/lessons\/formatting\/$/,
  );
  await expect(
    revisit.getByText("Пересмотреть", { exact: true }),
  ).toBeVisible();
  await revisit.click();

  await expect(
    page.getByText(
      "Урок обновлён после твоего завершения. Завершение сохранено.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.locator("header").getByLabel("Статус урока: Завершён"),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Завершить обновлённый урок" })
    .click();

  await expect(
    page
      .locator("header")
      .getByText("Обновлён после завершения", { exact: true }),
  ).toBeHidden();
  await expect(
    page.locator("header").getByLabel("Статус урока: Завершён"),
  ).toBeVisible();
  const completedRevision = await page.evaluate(() => {
    const progress = JSON.parse(
      localStorage.getItem("prosto-courses:progress:v1")!,
    );
    return progress.courses.markdown.destinations["lesson:formatting"]
      .completedRevision;
  });
  expect(completedRevision).toBe(2);
});

test("legacy Lesson Completion preserves its original Content Revision", async ({
  page,
}) => {
  await restoreLessonCompletion(page, "formatting");

  const lesson = page
    .getByRole("list", { name: "Уроки курса" })
    .getByRole("link", { name: /Заголовки, выделение и списки/ });
  await expect(
    lesson.getByLabel("Статус урока: Завершён"),
  ).toBeVisible();
  await expect(
    lesson.getByText("Обновлён после завершения", { exact: true }),
  ).toBeVisible();

  const completedRevision = await page.evaluate(() => {
    const progress = JSON.parse(
      localStorage.getItem("prosto-courses:progress:v1")!,
    );
    return progress.courses.markdown.destinations["lesson:formatting"]
      .completedRevision;
  });
  expect(completedRevision).toBe(1);
});

test("Course Overview refreshes Lesson Progress after browser back navigation", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await expect(
    page.locator("header").getByLabel("Статус урока: В процессе"),
  ).toBeVisible();

  await page.goBack();

  const lessons = page.getByRole("list", { name: "Уроки курса" });
  await expect(
    lessons.getByRole("link", { name: /Знакомство с Markdown/ }),
  ).toContainText("В процессе");
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );
});

test("restored Lesson refreshes progress from browser-local storage", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await expect(
    page.locator("header").getByLabel("Статус урока: В процессе"),
  ).toBeVisible();
  await page.evaluate(() => {
    const key = "prosto-courses:progress:v1";
    const progress = JSON.parse(localStorage.getItem(key)!);
    progress.courses.markdown.destinations["lesson:formatting"] = {
      state: "started",
      visitedAt: Date.now() + 1,
    };
    localStorage.setItem(key, JSON.stringify(progress));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });

  const lessons = page.getByRole("list", { name: "Уроки в навигации курса" });
  await expect(
    lessons.getByRole("link", { name: /Заголовки, выделение и списки/ }),
  ).toContainText("В процессе");
});

test("Lesson navigation refreshes progress after browser back navigation", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("link", { name: /Следующий урок/ }).click();
  await expect(
    page.locator("header").getByLabel("Статус урока: В процессе"),
  ).toBeVisible();

  await page.goBack();

  const lessons = page.getByRole("list", { name: "Уроки в навигации курса" });
  await expect(
    lessons.getByRole("link", { name: /Заголовки, выделение и списки/ }),
  ).toContainText("В процессе");
});

test("Course navigation stays consistent across pages in the same browser", async ({
  page,
  context,
}) => {
  const lessons = page.getByRole("list", { name: "Уроки курса" });
  const firstLesson = lessons.getByRole("link", {
    name: /Знакомство с Markdown/,
  });
  await expect(
    firstLesson.getByLabel("Статус урока: Не начат"),
  ).toContainText("○");

  const lessonPage = await context.newPage();
  await lessonPage.goto(
    "./courses/markdown/lessons/vvedenie/",
  );

  await expect(
    firstLesson.getByLabel("Статус урока: В процессе"),
  ).toContainText("◐");
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );

  await lessonPage.getByRole("button", { name: "Завершить урок" }).click();

  await expect(
    firstLesson.getByLabel("Статус урока: Завершён"),
  ).toContainText("✓");
});

test("every Lesson has consistent accessible status on both navigation surfaces", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page.getByRole("link", { name: /Следующий урок/ }).click();

  await expectThreeProgressStates(page, "Уроки в навигации курса");

  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await expectThreeProgressStates(page, "Уроки курса");
});

test("Lesson Progress survives title, order, and content edits at stable slugs", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();

  await page.route("**/courses/markdown/lessons/vvedenie/", async (route) => {
    const response = await route.fetch();
    const editedLesson = (await response.text())
      .replaceAll("Знакомство с Markdown", "Обновлённое введение")
      .replace("Урок 1 из 3", "Урок 2 из 3")
      .replace(
        "Markdown — это лёгкий язык разметки.",
        "Обновлённое содержание урока.",
      );
    await route.fulfill({ response, body: editedLesson });
  });
  await page.reload();

  await expect(
    page.getByRole("heading", { level: 1, name: "Обновлённое введение" }),
  ).toBeVisible();
  await expect(page.getByText("Урок 2 из 3", { exact: true })).toBeVisible();
  await expect(page.getByText("Обновлённое содержание урока.")).toBeVisible();
  await expect(
    page.locator("header").getByLabel("Статус урока: Завершён"),
  ).toContainText("✓");
  await expect(
    page.getByRole("button", { name: "Вернуть в работу" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("Course remains incomplete after every Lesson is complete", async ({ page }) => {
  await completeEveryLesson(page);
  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await expect(page.getByRole("status", { name: "Статус курса" })).toHaveText(
    "Статус курса: В процессе",
  );
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/modules\/osnovy\/checkpoint\/$/,
  );
});

test("reopening a Lesson changes completed Course behavior back to continue", async ({
  page,
}) => {
  await completeCoreRoute(page);

  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await page.getByRole("link", { name: "Освежить знания" }).click();
  await page.getByRole("button", { name: "Вернуть в работу" }).click();
  await page.getByRole("link", { name: "О курсе", exact: true }).click();

  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );
  await expect(page.getByRole("status", { name: "Статус курса" })).toHaveText(
    "Статус курса: В процессе",
  );
});

test("continue action falls back to the first incomplete Lesson", async ({ page }) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/formatting\/$/,
  );
});

test("completing the latest Lesson resumes the previously visited incomplete Lesson", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Начать курс" }).click();
  await page.getByRole("link", { name: /Следующий урок/ }).click();
  await page.getByRole("link", { name: /Следующий урок/ }).click();
  await page.locator('a[href$="/lessons/vvedenie/"]').first().click();
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/links-code\/$/,
  );
});

test("Course Completion requires explicit completion of every core destination", async ({
  page,
}) => {
  await completeEveryLesson(page);
  const checkpointSequenceLink = page.getByRole("link", {
    name: /Перейти к проверке Модуля/,
  });
  await expect(
    checkpointSequenceLink.getByLabel(
      "Статус проверки Модуля: Не начат",
    ),
  ).toBeVisible();
  await checkpointSequenceLink.click();

  const checkpointCompletion = page.locator("[data-completion-toggle]");
  await expect(checkpointCompletion).toHaveAccessibleName(
    "Завершить проверку Модуля",
  );
  await expect(
    page.locator("header").getByLabel("Статус проверки Модуля: В процессе"),
  ).toBeVisible();
  await checkpointCompletion.click();
  await expect(
    page.locator("header").getByLabel("Статус проверки Модуля: Завершён"),
  ).toBeVisible();
  await expect(checkpointCompletion).toHaveAttribute("aria-pressed", "true");

  const capstoneSequenceLink = page.getByRole("link", {
    name: /Перейти к итоговой работе/,
  });
  await expect(
    capstoneSequenceLink.getByLabel(
      "Статус итоговой работы: Не начат",
    ),
  ).toBeVisible();
  await capstoneSequenceLink.click();
  const capstoneCompletion = page.getByRole("button", {
    name: "Завершить итоговую работу",
  });
  await capstoneCompletion.click();
  await expect(
    page.locator("header").getByLabel("Статус итоговой работы: Завершён"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: /← Проверка Модуля/ })
      .getByLabel("Статус проверки Модуля: Завершён"),
  ).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Вернуть в работу" }).click();
  await expect(
    page.locator("header").getByLabel("Статус итоговой работы: В процессе"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Завершить итоговую работу" }).click();

  await page.goto("./courses/markdown/lessons/formatting/");
  await expect(
    page.getByText("Дополнительно — необязательно", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await expect(page.getByRole("status", { name: "Статус курса" })).toHaveText(
    "Статус курса: Завершён",
  );
  await expect(page.getByRole("link", { name: "Освежить знания" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );
  await expect(page.getByText(/не оценка и не сертификат/i)).toBeVisible();
});

test("Course resumes the most recently visited incomplete core destination", async ({
  page,
}) => {
  await page.getByRole("link", {
    name: /Проверка Модуля: Собери Markdown-памятку/,
  }).click();
  await page.getByRole("link", { name: "О курсе", exact: true }).click();
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/modules\/osnovy\/checkpoint\/$/,
  );

  await page.getByRole("link", {
    name: /Итоговая работа: Понятная инструкция в Markdown/,
  }).click();
  await expect(
    page.locator("header").getByLabel("Статус итоговой работы: В процессе"),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/capstone\/$/,
  );
});

test("core destination progress stays consistent across browser tabs", async ({
  page,
  context,
}) => {
  const checkpointLink = page.getByRole("link", {
    name: /Проверка Модуля: Собери Markdown-памятку/,
  });
  await expect(
    checkpointLink.getByLabel("Статус проверки Модуля: Не начат"),
  ).toBeVisible();

  const checkpointPage = await context.newPage();
  await checkpointPage.goto(
    "./courses/markdown/modules/osnovy/checkpoint/",
  );
  await expect(
    checkpointLink.getByLabel("Статус проверки Модуля: В процессе"),
  ).toBeVisible();

  await checkpointPage.getByRole("button", {
    name: "Завершить проверку Модуля",
  }).click();
  await expect(
    checkpointLink.getByLabel("Статус проверки Модуля: Завершён"),
  ).toBeVisible();
});

test("restored core page refreshes sequence status from browser-local storage", async ({
  page,
}) => {
  await page.goto("./courses/markdown/modules/osnovy/checkpoint/");
  await page.evaluate(() => {
    const key = "prosto-courses:progress:v1";
    const progress = JSON.parse(localStorage.getItem(key)!);
    progress.courses.markdown.destinations["capstone:capstone"] = {
      state: "started",
      visitedAt: Date.now() + 1,
    };
    localStorage.setItem(key, JSON.stringify(progress));
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );
  });

  await expect(
    page
      .getByRole("link", {
        name: /Итоговая работа: Понятная инструкция в Markdown/,
      })
      .getByLabel("Статус итоговой работы: В процессе"),
  ).toBeVisible();
});

test("malformed browser-local progress is ignored and can be replaced", async ({
  page,
}) => {
  await page.evaluate(() => {
    localStorage.setItem(
      "prosto-courses:progress:v1",
      JSON.stringify({
        courses: {
          markdown: {
            destinations: {
              "lesson:vvedenie": {
                state: "completed",
                visitedAt: "not-a-timestamp",
              },
              "checkpoint:osnovy": null,
            },
            lastIncomplete: "checkpoint:osnovy",
          },
        },
      }),
    );
  });
  await page.reload();

  await expect(page.getByRole("link", { name: "Начать курс" })).toHaveAttribute(
    "href",
    /\/lessons\/vvedenie\/$/,
  );
  await expect(
    page
      .getByRole("link", { name: /Знакомство с Markdown/ })
      .getByLabel("Статус урока: Не начат"),
  ).toBeVisible();

  await page.getByRole("link", {
    name: /Итоговая работа: Понятная инструкция в Markdown/,
  }).click();
  await page.getByRole("button", {
    name: "Завершить итоговую работу",
  }).click();
  await expect(
    page.locator("header").getByLabel("Статус итоговой работы: Завершён"),
  ).toBeVisible();
});

test("Lesson-only v1 progress migrates to the core route", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      "prosto-courses:progress:v1",
      JSON.stringify({
        courses: {
          markdown: {
            lessons: {
              vvedenie: {
                state: "completed",
                visitedAt: 1,
              },
            },
            lastIncomplete: "vvedenie",
          },
        },
      }),
    );
  });
  await page.reload();

  await expect(
    page
      .getByRole("link", { name: /Знакомство с Markdown/ })
      .getByLabel("Статус урока: Завершён"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Продолжить курс" })).toHaveAttribute(
    "href",
    /\/lessons\/formatting\/$/,
  );
});
