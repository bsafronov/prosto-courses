import { expect, test, type Locator, type Page } from "@playwright/test";

const lessonPath = "./courses/markdown/lessons/formatting/";

const themes = {
  light: {
    border: "rgb(228, 228, 231)",
    canvas: "rgb(250, 250, 250)",
    error: "rgb(161, 40, 40)",
    muted: "rgb(113, 113, 122)",
    surface: "rgb(255, 255, 255)",
  },
  dark: {
    border: "rgb(39, 39, 42)",
    canvas: "rgb(9, 9, 11)",
    error: "rgb(240, 154, 154)",
    muted: "rgb(161, 161, 170)",
    surface: "rgb(24, 24, 27)",
  },
} as const;

const viewports = [
  { name: "320px", width: 320, height: 800 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

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

function workAreaCards(page: Page) {
  return {
    practiceTask: page.getByRole("region", {
      name: "Собери структуру заметки",
    }),
    reflection: page.getByRole("region", {
      name: "Как изменился бы твой способ оформлять заметку после этого урока?",
    }),
    completion: page.getByRole("region", {
      name: "Завершение урока",
    }),
  };
}

for (const [theme, colors] of Object.entries(themes)) {
  for (const viewport of viewports) {
    test(`independent work areas share ${theme} Card anatomy at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(lessonPath);
      await page
        .getByRole("combobox", { name: "Тема оформления" })
        .selectOption(theme);

      const { practiceTask, reflection, completion } = workAreaCards(page);

      expect(await cardSurface(reflection)).toEqual(
        await cardSurface(practiceTask),
      );
      expect(await cardSurface(completion)).toEqual(
        await cardSurface(practiceTask),
      );

      for (const card of [practiceTask, reflection, completion]) {
        await expect(card).toHaveCSS("background-color", colors.surface);
        await expect(card.locator('[data-card-region="eyebrow"]')).toHaveCSS(
          "font-size",
          "12px",
        );
        await expect(card.locator('[data-card-region="title"]')).toHaveCSS(
          "font-size",
          "20px",
        );
      }

      await expect(
        practiceTask.locator('[data-card-region="description"]'),
      ).toHaveCSS("font-size", "14px");
      await expect(
        completion.locator('[data-card-region="description"]'),
      ).toHaveCSS("font-size", "14px");
      await expect(reflection.locator(".privacy")).toHaveCSS(
        "font-size",
        "14px",
      );
      await expect(practiceTask.locator("[data-task-prompt]")).toHaveCSS(
        "font-size",
        "16px",
      );
      expect(
        await practiceTask.locator("[data-card-region]").evaluateAll((regions) =>
          regions.map((region) => region.getAttribute("data-card-region")),
        ),
      ).toEqual(["eyebrow", "title", "description", "body"]);
      expect(
        await reflection.locator("[data-card-region]").evaluateAll((regions) =>
          regions.map((region) => region.getAttribute("data-card-region")),
        ),
      ).toEqual(["eyebrow", "title", "body", "actions"]);
      expect(
        await completion.locator("[data-card-region]").evaluateAll((regions) =>
          regions.map((region) => region.getAttribute("data-card-region")),
        ),
      ).toEqual(["eyebrow", "title", "description", "actions"]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
    });
  }

  for (const accommodation of [
    "200% text zoom",
    "WCAG text spacing",
  ] as const) {
    test(`work-area Cards reflow with ${accommodation} in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(lessonPath);
      await page
        .getByRole("combobox", { name: "Тема оформления" })
        .selectOption(theme);

      if (accommodation === "200% text zoom") {
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
      } else {
        await page.addStyleTag({
          content: `
            .card,
            .card * {
              line-height: 1.5 !important;
              letter-spacing: 0.12em !important;
              word-spacing: 0.16em !important;
            }
            .card p {
              margin-bottom: 2em !important;
            }
          `,
        });
      }

      const { practiceTask, reflection, completion } = workAreaCards(page);
      for (const card of [practiceTask, reflection, completion]) {
        await expect(card).toBeVisible();
        const box = await card.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(320);
        expect(
          await card.evaluate((root) => {
            const rootRight = root.getBoundingClientRect().right;
            return [...root.querySelectorAll<HTMLElement>("*")]
              .filter(
                (element) =>
                  element.getBoundingClientRect().right > rootRight ||
                  (element.scrollWidth > element.clientWidth &&
                    getComputedStyle(element).overflowX === "visible"),
              )
              .map((element) => ({
                className: element.className,
                tagName: element.tagName,
              }));
          }),
        ).toEqual([]);
      }
      await expect(
        reflection.getByRole("textbox", { name: "Твоя заметка" }),
      ).toBeVisible();
      await expect(completion.getByRole("button")).toBeVisible();
    });
  }

  test(`work-area behavior states use shared ${theme} tokens`, async ({
    page,
  }) => {
    await page.goto(lessonPath);
    await page
      .getByRole("combobox", { name: "Тема оформления" })
      .selectOption(theme);

    const { reflection, completion } = workAreaCards(page);
    const deleteNote = reflection.getByRole("button", {
      name: "Удалить навсегда",
    });
    await expect(deleteNote).toBeDisabled();
    await expect(deleteNote).toHaveCSS("background-color", colors.canvas);
    await expect(deleteNote).toHaveCSS("color", colors.muted);
    await reflection
      .getByRole("textbox", { name: "Твоя заметка" })
      .fill("Проверить структуру заметки.");
    await expect(deleteNote).toBeEnabled();
    await expect(deleteNote).toHaveCSS("border-top-color", colors.error);
    await expect(deleteNote).toHaveCSS("color", colors.error);

    const toggle = completion.locator("[data-completion-toggle]");
    await expect(toggle).toHaveAccessibleName("Завершить урок");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveCSS("background-color", colors.canvas);
    await expect(toggle).toHaveCSS("border-top-color", colors.border);
  });
}
