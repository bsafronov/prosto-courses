import { expect, test, type Locator, type Page } from "@playwright/test";

async function cardSurface(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderTopColor,
      borderRadius: style.borderRadius,
      borderStyle: style.borderTopStyle,
      borderWidth: style.borderTopWidth,
      boxShadow: style.boxShadow,
      paddingBlockStart: style.paddingBlockStart,
      paddingInlineStart: style.paddingInlineStart,
    };
  });
}

const themes = {
  light: {
    canvas: "rgb(250, 250, 250)",
    border: "rgb(228, 228, 231)",
    focus: "rgb(63, 63, 70)",
    ink: "rgb(24, 24, 27)",
    muted: "rgb(113, 113, 122)",
    surface: "rgb(255, 255, 255)",
  },
  dark: {
    canvas: "rgb(9, 9, 11)",
    border: "rgb(39, 39, 42)",
    focus: "rgb(212, 212, 216)",
    ink: "rgb(250, 250, 250)",
    muted: "rgb(161, 161, 170)",
    surface: "rgb(24, 24, 27)",
  },
} as const;

const responsiveViewports = [
  {
    name: "320px",
    width: 320,
    height: 800,
    display: "40px",
    pageTitle: "32px",
    sectionTitle: "28px",
  },
  {
    name: "desktop",
    width: 1280,
    height: 900,
    display: "64px",
    pageTitle: "48px",
    sectionTitle: "36px",
  },
] as const;

async function selectTheme(page: Page, theme: string) {
  await page
    .getByRole("combobox", { name: "Тема оформления" })
    .selectOption(theme);
}

for (const [theme, colors] of Object.entries(themes)) {
  for (const viewport of responsiveViewports) {
    test(`Catalog and offline Cards keep ${theme} contracts at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("./");
      await selectTheme(page, theme);

      const hero = page.getByRole("heading", {
        level: 1,
        name: "Выбери Курс и начни с первого Урока.",
      });
      await expect(hero).toHaveCSS("font-size", viewport.display);
      await expect(page.getByText(/^Читай, пробуй/)).toHaveCSS(
        "font-size",
        "18px",
      );
      await expect(
        page.getByRole("heading", { level: 2, name: "Все курсы" }),
      ).toHaveCSS("font-size", viewport.sectionTitle);
      await expect(
        page
          .getByRole("region", { name: "Все курсы" })
          .locator(":scope > header > .type-meta"),
      ).toHaveCSS("font-size", "12px");

      const catalog = page.getByRole("list", { name: "Каталог курсов" });
      const catalogCard = catalog
        .getByRole("listitem")
        .filter({ hasText: "Основы Markdown" })
        .locator("article");
      await expect(catalogCard).toHaveCount(1);
      await expect(
        catalogCard.getByRole("heading", { level: 3, name: "Основы Markdown" }),
      ).toHaveCSS("font-size", "20px");
      await expect(
        catalog.getByRole("heading", {
          level: 3,
          name: "Психологическая помощь дошкольникам",
        }),
      ).toBeVisible();
      await expect(
        catalogCard.locator('[data-card-region="description"]'),
      ).toHaveCSS("font-size", "14px");
      await expect(
        catalogCard.locator('[data-card-region="body"]'),
      ).toHaveCSS("font-size", "16px");
      expect(
        await catalogCard.locator("[data-card-region]").evaluateAll((regions) =>
          regions.map((region) => region.getAttribute("data-card-region")),
        ),
      ).toEqual(["eyebrow", "title", "description", "body", "actions"]);
      await expect(catalogCard).toHaveCSS("background-color", colors.surface);
      await expect(catalogCard).toHaveCSS("color", colors.ink);
      const catalogSurface = await cardSurface(catalogCard);

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);

      await page.goto("./offline/");

      const offlineCard = page.getByRole("region", {
        name: "Эта страница не сохранена",
      });
      await expect(offlineCard).toHaveCount(1);
      await expect(
        offlineCard.getByRole("heading", {
          level: 1,
          name: "Эта страница не сохранена",
        }),
      ).toHaveCSS("font-size", viewport.pageTitle);
      await expect(offlineCard).toHaveCSS("background-color", colors.surface);
      await expect(offlineCard).toHaveCSS("color", colors.ink);
      expect(
        await offlineCard.locator("[data-card-region]").evaluateAll((regions) =>
          regions.map((region) => region.getAttribute("data-card-region")),
        ),
      ).toEqual(["eyebrow", "title", "description", "actions"]);
      expect(await cardSurface(offlineCard)).toEqual(catalogSurface);

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
    });
  }
}

const learningJourney = [
  {
    kind: "Module",
    path: "./courses/markdown/modules/osnovy/",
    title: "От исходника к структуре",
    current: "От исходника к структуре",
  },
  {
    kind: "Lesson",
    path: "./courses/markdown/lessons/vvedenie/",
    title: "Знакомство с Markdown",
    current: /Знакомство с Markdown/,
  },
  {
    kind: "Module Checkpoint",
    path: "./courses/markdown/modules/osnovy/checkpoint/",
    title: "Объясни путь от исходника к документу",
    current: /Проверка Модуля: Объясни путь от исходника к документу/,
  },
  {
    kind: "Capstone Demonstration",
    path: "./courses/markdown/capstone/",
    title: "Понятная инструкция в Markdown",
    current: /Итоговая работа: Понятная инструкция в Markdown/,
  },
] as const;

for (const [theme, colors] of Object.entries(themes)) {
  for (const viewport of responsiveViewports) {
    test(`Learning journey keeps ${theme} UI contracts at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);

      for (const destination of learningJourney) {
        await page.goto(destination.path);
        await selectTheme(page, theme);

        const article = page.locator("main article");
        const title = article.getByRole("heading", {
          level: 1,
          name: destination.title,
        });
        const readingFlow = article.locator(".reading-flow");
        const courseRoute = page.getByRole("navigation", {
          name: "Навигация по курсу",
        });

        await expect(title).toHaveCSS("font-size", viewport.pageTitle);
        await expect(article).toHaveCSS("font-size", "18px");
        await expect(readingFlow.locator("p:not([class])").first()).toHaveCSS(
          "font-size",
          "18px",
        );
        if (viewport.width === 320) {
          await page
            .getByRole("button", { name: "Открыть маршрут курса" })
            .click();
        }
        await expect(
          courseRoute.getByRole("link", { name: destination.current }),
        ).toHaveAttribute("aria-current", "page");
        await expect(courseRoute.locator("[data-progress-status]").first()).toHaveCSS(
          "font-size",
          "12px",
        );
        await expect(
          article
            .getByRole("navigation", { name: /Последовательность/ })
            .getByRole("link")
            .first(),
        ).toHaveCSS("font-size", "14px");
        await expect(article).toHaveCSS("color", colors.ink);

        if (viewport.width === 320) {
          const drawer = page.getByRole("dialog", { name: "Маршрут курса" });
          await expect(drawer).toHaveCSS("position", "fixed");
          await expect(drawer).toHaveCSS("background-color", colors.canvas);
          await expect(drawer).toHaveCSS("border-right-color", colors.border);
          await expect(drawer).toHaveCSS("border-right-width", "1px");
          await page.keyboard.press("Escape");
        } else {
          await expect(page.locator("[data-course-route-panel]")).toHaveCSS(
            "position",
            "sticky",
          );
          await expect(page.locator("[data-course-route-panel]")).toHaveCSS(
            "width",
            "288px",
          );
        }

        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
          `${destination.kind} overflows ${viewport.name}`,
        ).toBeLessThanOrEqual(viewport.width);
      }
    });
  }
}

for (const [theme, colors] of Object.entries(themes)) {
  for (const viewport of responsiveViewports) {
    test(`Course Overview keeps ${theme} UI contracts at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("./courses/markdown/");
      await selectTheme(page, theme);

      const overviewCard = page.getByRole("region", {
        name: "Основы Markdown",
      });
      const routeCard = page.getByRole("region", { name: "Маршрут курса" });
      const title = overviewCard.getByRole("heading", {
        level: 1,
        name: "Основы Markdown",
      });
      const action = overviewCard.getByRole("link", { name: "Начать" });

      await expect(title).toHaveCSS("font-size", viewport.pageTitle);
      await expect(
        overviewCard.locator('[data-card-region="description"]'),
      ).toHaveCSS("font-size", "14px");
      await expect(
        overviewCard.locator('[data-card-region="description"]'),
      ).toHaveCSS("max-width", "688px");
      await expect(action).toHaveAttribute("href", /\/lessons\/vvedenie\/$/);
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(
        await overviewCard
          .locator("[data-card-region]")
          .evaluateAll((regions) =>
            regions.map((region) => region.getAttribute("data-card-region")),
          ),
      ).toEqual(["eyebrow", "title", "description", "body", "actions"]);

      await expect(
        routeCard.getByRole("heading", { level: 2, name: "Маршрут курса" }),
      ).toHaveCSS("font-size", "20px");
      await expect(routeCard.locator('[data-card-region="description"]')).toHaveCSS(
        "font-size",
        "14px",
      );
      await expect(
        routeCard.getByRole("link", { name: "От исходника к структуре" }),
      ).toHaveCSS("font-size", "12px");
      await expect(routeCard.locator(".route-node").first()).toHaveCSS(
        "font-family",
        /IBM Plex Mono/,
      );
      await expect(routeCard.locator("[data-progress-status]").first()).toHaveCSS(
        "font-family",
        /Onest/,
      );

      const details = page.getByRole("article", {
        name: "Подробнее о курсе",
      });
      await expect(
        details.getByRole("heading", { level: 2, name: "Чему ты научишься" }),
      ).toHaveCSS("font-size", viewport.sectionTitle);
      await expect(details).toHaveCSS("font-size", "18px");
      await expect(details.locator(".completion-note")).toHaveCSS(
        "font-size",
        "14px",
      );
      for (const summary of [
        details.getByRole("group", { name: "Объём курса" }),
        details.getByRole("group", { name: "Актуальность материалов" }),
      ]) {
        await expect(summary.locator("dt").first()).toHaveCSS("font-size", "12px");
        await expect(summary.locator("dd").first()).toHaveCSS("font-size", "16px");
      }

      await expect(overviewCard).toHaveCSS("background-color", colors.surface);
      await expect(overviewCard).toHaveCSS("color", colors.ink);
      await expect(overviewCard.locator('[data-card-region="description"]')).toHaveCSS(
        "color",
        colors.muted,
      );
      expect(await cardSurface(routeCard)).toEqual(await cardSurface(overviewCard));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);

      await page.evaluate(() => {
        localStorage.setItem(
          "prosto-courses:progress:v1",
          JSON.stringify({
            courses: {
              markdown: {
                destinations: {
                  "lesson:formatting": {
                    state: "completed",
                    visitedAt: 1,
                    completedRevision: 1,
                  },
                  "lesson:source-render": {
                    state: "started",
                    visitedAt: 2,
                  },
                },
              },
            },
          }),
        );
      });
      await page.reload();

      await expect(
        overviewCard.getByRole("link", { name: "Продолжить" }),
      ).toHaveAttribute("href", /\/lessons\/source-render\/$/);
      const revisedLesson = routeCard.getByRole("link", {
        name: "Пересмотреть обновлённый урок: Заголовки, выделение и списки",
      });
      await expect(
        revisedLesson.getByText("Обновлён после завершения", { exact: true }),
      ).toBeVisible();
      await expect(
        revisedLesson.getByLabel("Статус урока: Завершён"),
      ).toBeVisible();
    });
  }
}

for (const [theme, colors] of Object.entries(themes)) {
  test(`Shell and controls keep accessible ${theme} presentation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("./courses/accessible-images/lessons/describe-purpose/");

    const themeControl = page.getByRole("combobox", {
      name: "Тема оформления",
    });
    await themeControl.selectOption(theme);

    const pwaControl = page.getByRole("group", {
      name: "Приложение и офлайн-доступ",
    });
    const exactCheck = page.locator(
      '[data-knowledge-check][data-type="exact"]',
    );
    const textInput = exactCheck.getByRole("textbox", { name: "Ответ" });
    const matchingSelect = page.getByRole("combobox", {
      name: "Соответствие для «Surrounding context»",
    });
    const checkButton = exactCheck.getByRole("button", {
      name: "Проверить ответ",
    });

    for (const target of [themeControl, textInput, matchingSelect, checkButton]) {
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await target.focus();
      await expect(target).toHaveCSS("outline-color", colors.focus);
      await expect(target).toHaveCSS("outline-style", "solid");
      await expect(target).toHaveCSS("outline-width", "2px");
    }
    await expect(textInput).toHaveCSS("border-top-color", colors.muted);
    await expect(matchingSelect).toHaveCSS("border-top-color", colors.muted);

    const catalogLink = page.getByRole("link", { name: "Каталог" });
    const aboutCourseLink = page.getByRole("link", { name: "О курсе" });
    for (const target of [catalogLink, aboutCourseLink]) {
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(24);
    }

    for (const target of [
      page.locator("body"),
      page.getByRole("banner"),
      page.getByRole("contentinfo"),
      themeControl,
      pwaControl,
      textInput,
      matchingSelect,
      checkButton,
      page.locator("[data-course-progress]"),
      page.locator("[data-progress-status]").first(),
      page.locator("[data-revision-revisit]").first(),
      page.locator(".lesson-progress"),
    ]) {
      await expect(target).toHaveCSS("font-family", /Onest/);
    }
    for (const target of [
      aboutCourseLink,
      page.locator(".module-title a").first(),
      page.locator("[data-lesson-link]").first(),
    ]) {
      await expect(target).toHaveCSS("font-size", "12px");
    }

    await expect(page.locator("body")).toHaveCSS("color", colors.ink);
    await expect(pwaControl).toHaveCSS("background-color", colors.surface);
    await expect(page.getByRole("banner")).toHaveCSS(
      "border-bottom-width",
      "1px",
    );

    await page.goto("./courses/markdown/lessons/formatting/");
    const deleteReflection = page.getByRole("button", {
      name: "Удалить навсегда",
    });
    await expect(deleteReflection).toBeDisabled();
    await expect(deleteReflection).toHaveCSS("cursor", "not-allowed");
    await expect(deleteReflection).toHaveCSS("opacity", "1");
    await expect(deleteReflection).toHaveCSS("border-top-width", "1px");
    await expect(deleteReflection).toHaveCSS("border-top-color", colors.muted);
    await expect(page.getByRole("textbox", { name: "Твоя заметка" })).toHaveCSS(
      "border-top-color",
      colors.muted,
    );
    await expect(page.locator(".privacy")).toHaveCSS("font-family", /Onest/);
    await expect(page.locator(".privacy")).toHaveCSS("line-height", "16.8px");
  });
}

test("Long Lesson title keeps responsive Header and keyboard Course route", async ({
  page,
}) => {
  const title = "Синдром Дауна: учитывать развитие и здоровье";
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    "./courses/psihologicheskaya-pomoshch-doshkolnikam/lessons/sindrom-dauna-razvitie-i-zdorove/",
  );

  const header = page.getByRole("banner");
  const routeToggle = header.getByRole("button", {
    name: "Открыть маршрут курса",
  });
  await expect(
    header.getByRole("link", { name: "Prosto.Courses" }),
  ).toBeVisible();
  await expect(routeToggle).toBeHidden();

  await page.setViewportSize({ width: 320, height: 800 });
  const mobileTitle = header.getByText(title, { exact: true });
  await expect(routeToggle).toBeVisible();
  await expect(mobileTitle).toBeVisible();
  await expect(mobileTitle).toHaveCSS("text-overflow", "ellipsis");
  await expect(mobileTitle).toHaveCSS("white-space", "nowrap");
  const [toggleBox, titleBox, themeBox] = await Promise.all([
    routeToggle.boundingBox(),
    mobileTitle.boundingBox(),
    header
      .getByRole("combobox", { name: "Тема оформления" })
      .boundingBox(),
  ]);
  expect(toggleBox).not.toBeNull();
  expect(titleBox).not.toBeNull();
  expect(themeBox).not.toBeNull();
  expect(toggleBox!.width).toBeGreaterThanOrEqual(44);
  expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
  expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(titleBox!.x);
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(themeBox!.x);

  await routeToggle.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Маршрут курса" });
  const close = drawer.getByRole("button", { name: "Закрыть маршрут курса" });
  await expect(close).toBeFocused();
  const closeBox = await close.boundingBox();
  expect(closeBox).not.toBeNull();
  expect(closeBox!.width).toBeGreaterThanOrEqual(44);
  expect(closeBox!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Escape");
  await expect(routeToggle).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
