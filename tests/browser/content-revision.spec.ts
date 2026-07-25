import { expect, test, type Page } from "@playwright/test";

const courseOverview = "./courses/lesson-history/";

function lessonLink(page: Page, title: RegExp) {
  return page.getByRole("link", { name: title });
}

test.beforeEach(async ({ page }) => {
  await page.goto(courseOverview);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "prosto-courses:progress:v1",
      JSON.stringify({
        courses: {
          "lesson-history": {
            destinations: {
              "lesson:unchanged-lesson": {
                state: "completed",
                visitedAt: 1,
                completedRevision: 1,
              },
              "lesson:revised-lesson": {
                state: "completed",
                visitedAt: 2,
                completedRevision: 1,
              },
              "lesson:moved-lesson": {
                state: "completed",
                visitedAt: 3,
                completedRevision: 1,
              },
              "lesson:retired-lesson": {
                state: "completed",
                visitedAt: 4,
                completedRevision: 3,
              },
            },
          },
        },
      }),
    );
  });
  await page.reload();
});

test("unchanged Lesson fixture preserves completion without an update state", async ({
  page,
}) => {
  const lesson = lessonLink(page, /Урок без материальных изменений/);

  await expect(
    lesson.getByLabel("Статус урока: Завершён"),
  ).toBeVisible();
  await expect(
    lesson.getByText("Обновлён после завершения", { exact: true }),
  ).toBeHidden();
});

test("revised Lesson fixture preserves completion and offers a revisit", async ({
  page,
}) => {
  const lesson = page.getByRole("link", {
    name: "Пересмотреть обновлённый урок: Материально обновлённый урок",
  });

  await expect(
    lesson.getByLabel("Статус урока: Завершён"),
  ).toBeVisible();
  await expect(
    lesson.getByText("Обновлён после завершения", { exact: true }),
  ).toBeVisible();
  await expect(lesson).toHaveAttribute(
    "href",
    /\/courses\/lesson-history\/lessons\/revised-lesson\/$/,
  );
});

test("moved Lesson fixture keeps its Course-level URL and stored progress", async ({
  page,
}) => {
  const lesson = lessonLink(page, /Урок после переноса/);

  await expect(
    lesson.getByLabel("Статус урока: Завершён"),
  ).toBeVisible();
  await expect(lesson).toHaveAttribute(
    "href",
    /\/courses\/lesson-history\/lessons\/moved-lesson\/$/,
  );
  await lesson.click();
  await expect(page).toHaveURL(
    /\/courses\/lesson-history\/lessons\/moved-lesson\/$/,
  );
  await expect(
    page.getByRole("link", { name: "Новое место", exact: true }),
  ).toBeVisible();
});

test("replacement Lesson fixture does not inherit the retired slug's progress", async ({
  page,
}) => {
  const replacement = lessonLink(page, /Урок с новой способностью/);

  await expect(
    replacement.getByLabel("Статус урока: Не начат"),
  ).toBeVisible();
  await expect(replacement).toHaveAttribute(
    "href",
    /\/courses\/lesson-history\/lessons\/replacement-lesson\/$/,
  );
});
