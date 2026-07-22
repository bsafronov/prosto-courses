import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./courses/markdown/lessons/vvedenie/");
});

test("Callouts expose their meaning in text and structure without relying on color", async ({
  page,
}) => {
  const keyIdea = page.getByRole("complementary", {
    name: "Ключевая мысль",
  });
  await expect(keyIdea).toBeVisible();
  await expect(keyIdea.getByText("Ключевая мысль", { exact: true })).toBeVisible();
  await expect(keyIdea).toContainText(
    "Разметка описывает роль фрагмента текста, а не его точный внешний вид.",
  );

  await page.goto("./courses/markdown/lessons/formatting/");
  const advanced = page.getByRole("complementary", {
    name: "Дополнительно — необязательно",
  });
  await expect(advanced).toBeVisible();
  await expect(advanced).toContainText("необязательно");
});

test("Diagram renders Mermaid with an equivalent visible interpretation", async ({
  page,
}) => {
  const diagram = page.getByRole("figure", {
    name: "Как Markdown становится страницей",
  });
  await expect(diagram).toBeVisible();
  await expect(
    diagram.getByRole("img", {
      name: "Исходный Markdown проходит через преобразователь и становится HTML-страницей.",
    }),
  ).toHaveAttribute("aria-busy", "false");
  await expect(diagram).toContainText("Читай схему слева направо");
  await expect(diagram).toContainText(
    "Markdown хранит структуру отдельно от оформления.",
  );

  const firstCheckOption = page.getByRole("radio").first();
  for (let step = 0; step < 20; step += 1) {
    const optionIsFocused = await firstCheckOption.evaluate(
      (option) => option === document.activeElement,
    );
    if (optionIsFocused) {
      break;
    }
    await page.keyboard.press("Tab");
  }
  await expect(firstCheckOption).toBeFocused();
});

test("semantic visuals remain usable at a narrow width and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });

  const diagram = page.getByRole("figure", {
    name: "Как Markdown становится страницей",
  });
  await expect(diagram.getByRole("img")).toHaveAttribute("aria-busy", "false");
  expect(
    await diagram.evaluate(() =>
      document
        .getAnimations()
        .some((animation) => animation.playState === "running"),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
