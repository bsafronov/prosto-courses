import { expect, test, type Page } from "@playwright/test";

type Theme = "light" | "dark";

async function openWithTheme(page: Page, path: string, theme: Theme) {
  await page.goto(path);
  await page
    .getByRole("combobox", { name: "Тема оформления" })
    .selectOption(theme);
}

function contrastRatio(first: string, second: string) {
  const channels = (color: string) =>
    color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((value) => {
        const channel = value / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
  const luminance = (color: string) => {
    const [red, green, blue] = channels(color);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test("long-form prose keeps a divided reading rhythm in both themes", async ({
  page,
}) => {
  for (const theme of ["light", "dark"] as const) {
    await openWithTheme(page, "./courses/markdown/lessons/portability/", theme);

    const heading = page.getByRole("heading", {
      level: 2,
      name: "База и расширения",
    });
    const table = page.getByRole("table");
    const inlineCode = table.getByText("#", { exact: true });
    const paragraph = page.getByText(/^Ты получил исходник с таблицей/);
    const codeBlock = page.locator("pre").filter({ hasText: "- [x]" });

    await expect(heading).toHaveCSS("border-top-width", "1px");
    await expect(table).toHaveCSS("border-collapse", "collapse");
    await expect(table.getByRole("columnheader").first()).toHaveCSS(
      "border-bottom-width",
      "1px",
    );
    await expect(inlineCode).toHaveCSS("font-family", /IBM Plex Mono/);

    const presentation = await paragraph.evaluate((element) => {
      const paragraphStyle = getComputedStyle(element);
      return {
        paragraphLineHeight:
          Number.parseFloat(paragraphStyle.lineHeight) /
          Number.parseFloat(paragraphStyle.fontSize),
      };
    });
    await expect(codeBlock).toHaveCSS("overflow-x", "auto");
    await expect(codeBlock.locator("code")).toHaveCSS(
      "font-family",
      /IBM Plex Mono/,
    );
    const codeColors = await codeBlock.evaluate((element) => ({
      foreground: getComputedStyle(element).color,
      background: getComputedStyle(element).backgroundColor,
    }));

    expect(presentation.paragraphLineHeight).toBeGreaterThanOrEqual(1.65);
    expect(
      contrastRatio(codeColors.foreground, codeColors.background),
    ).toBeGreaterThanOrEqual(4.5);

    await page.goto("./courses/markdown/lessons/review/");
    const list = page
      .getByRole("list")
      .filter({ hasText: "Контекст: назови читателя" });
    expect(
      Number.parseFloat(
        await list.evaluate(
          (element) => getComputedStyle(element).paddingInlineStart,
        ),
      ),
    ).toBeGreaterThanOrEqual(20);
  }
});

test("Learning Visuals remain unboxed and focusable in both themes", async ({
  page,
}) => {
  for (const theme of ["light", "dark"] as const) {
    await openWithTheme(page, "./courses/markdown/lessons/vvedenie/", theme);

    const diagram = page.getByRole("figure", {
      name: "Как Markdown становится страницей",
    });
    const diagramVisual = diagram.getByRole("img");
    await expect(diagramVisual).toHaveAttribute("aria-busy", "false");
    await expect(diagram).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(diagram).toHaveCSS("border-top-width", "0px");
    const diagramColors = await diagramVisual.evaluate((element) => ({
      foreground: getComputedStyle(element).color,
      canvas: getComputedStyle(document.body).backgroundColor,
    }));
    expect(
      contrastRatio(diagramColors.foreground, diagramColors.canvas),
    ).toBeGreaterThanOrEqual(4.5);

    await page.goto("./courses/markdown/lessons/review/");
    const chart = page.getByRole("figure", {
      name: "Проблемы учебной инструкции по этапам проверки",
    });
    const chartVisual = chart.getByRole("img");
    await expect(chart).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(chart).toHaveCSS("border-top-width", "0px");
    await expect(
      chart.getByRole("list", { name: "Легенда графика" }),
    ).toContainText("Структура");
    const chartColors = await chartVisual.evaluate((element) => ({
      foreground: getComputedStyle(element).color,
      canvas: getComputedStyle(document.body).backgroundColor,
    }));
    expect(
      contrastRatio(chartColors.foreground, chartColors.canvas),
    ).toBeGreaterThanOrEqual(4.5);
    await chartVisual.focus();
    await expect(chartVisual).toHaveCSS("outline-width", "2px");

    await page.goto("./courses/accessible-images/lessons/describe-purpose/");
    const imageFigure = page.getByRole("figure", {
      name: "Illustrative context label used to test sourced-image alternatives.",
    });
    const image = imageFigure.getByRole("img", {
      name: "A gray rectangle labeled Context",
    });
    const imagePresentation = await image.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        border: style.borderTopColor,
        canvas: getComputedStyle(document.body).backgroundColor,
        width: element.getBoundingClientRect().width,
        containerWidth: element.parentElement!.getBoundingClientRect().width,
      };
    });
    expect(
      contrastRatio(imagePresentation.border, imagePresentation.canvas),
    ).toBeGreaterThanOrEqual(3);
    expect(imagePresentation.width).toBeLessThanOrEqual(
      imagePresentation.containerWidth,
    );
    await expect(imageFigure).toContainText("Generated platform fixture");
    await expect(imageFigure).toContainText("Course-owned");
  }
});

test("semantic warnings and errors pair quiet color with visible meaning", async ({
  page,
}) => {
  const meanings = [
    {
      path: "./courses/markdown/lessons/links-code/",
      label: "Предупреждение",
    },
    {
      path: "./courses/markdown/lessons/portability/",
      label: "Ошибка",
    },
  ] as const;

  for (const theme of ["light", "dark"] as const) {
    for (const meaning of meanings) {
      await openWithTheme(page, meaning.path, theme);

      const callout = page.getByRole("complementary", {
        name: meaning.label,
      });
      await expect(
        callout.getByText(meaning.label, { exact: true }),
      ).toBeVisible();
      await expect(callout).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(callout).toHaveCSS("border-left-width", "2px");
      await expect(callout).toHaveCSS("border-top-width", "0px");

      const colors = await callout
        .getByText(meaning.label, { exact: true })
        .evaluate((element) => ({
          label: getComputedStyle(element).color,
          canvas: getComputedStyle(document.body).backgroundColor,
        }));
      expect(contrastRatio(colors.label, colors.canvas)).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  }
});

test("Diagram keeps its labels readable and scrollable at narrow widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./courses/markdown/lessons/vvedenie/");

  const visual = page
    .getByRole("figure", { name: "Как Markdown становится страницей" })
    .getByRole("img");
  await expect(visual).toHaveAttribute("aria-busy", "false");

  const presentation = await visual.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    hasContainedOverflow: element.scrollWidth > element.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));

  expect(presentation.scrollWidth).toBeGreaterThanOrEqual(700);
  expect(presentation.hasContainedOverflow).toBe(true);
  expect(presentation.pageWidth).toBeLessThanOrEqual(390);

  await visual.focus();
  await expect(visual).toBeFocused();
  await expect(visual).toHaveCSS("outline-width", "2px");
});
