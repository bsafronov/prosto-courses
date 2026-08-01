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
    ink: "rgb(24, 24, 27)",
    surface: "rgb(255, 255, 255)",
  },
  dark: {
    ink: "rgb(250, 250, 250)",
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
