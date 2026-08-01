import { expect, test, type Locator } from "@playwright/test";

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
    focus: "rgb(63, 63, 70)",
    ink: "rgb(24, 24, 27)",
    muted: "rgb(113, 113, 122)",
    surface: "rgb(255, 255, 255)",
  },
  dark: {
    focus: "rgb(212, 212, 216)",
    ink: "rgb(250, 250, 250)",
    muted: "rgb(161, 161, 170)",
    surface: "rgb(24, 24, 27)",
  },
} as const;

for (const [theme, colors] of Object.entries(themes)) {
  for (const viewport of [
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
  ]) {
    test(`Catalog and offline Cards keep ${theme} contracts at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("./");
      await page
        .getByRole("combobox", { name: "Тема оформления" })
        .selectOption(theme);

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
