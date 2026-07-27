import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("Home gives a new learner a direct, editorial path into the Course Catalog", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Выбери Курс и начни с первого Урока.",
    }),
  ).toBeVisible();
  await expect(page.getByText(/Прогресс останется в этом браузере/)).toBeVisible();
  await expect(
    page.getByText(/Каталог можно подготовить для работы офлайн/),
  ).toBeVisible();

  const catalog = page.getByRole("list", { name: "Каталог курсов" });
  const markdown = catalog
    .getByRole("listitem")
    .filter({ hasText: "Основы Markdown" });
  await expect(markdown).toContainText("3 Модуля");
  await expect(markdown).toContainText("6 Уроков");
  await expect(markdown).toContainText("3 ч 55 мин");
  await expect(markdown).toContainText("Не начат");
  await expect(
    markdown.getByRole("link", { name: "Открыть Курс" }),
  ).toHaveAttribute("href", /\/courses\/markdown\/$/);
});

test("Home keeps its primary header controls clear on a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const offline = page.getByRole("group", { name: "Офлайн-доступ" });
  const brand = page.getByRole("link", { name: "Prosto.Courses" });
  const theme = page.getByRole("combobox", { name: "Тема оформления" });
  await expect(offline).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Каталог", exact: true }),
  ).toBeHidden();
  await expect(brand).toBeVisible();
  await expect(theme).toBeVisible();

  const [brandBox, themeBox, offlineBox] = await Promise.all([
    brand.boundingBox(),
    theme.boundingBox(),
    offline.boundingBox(),
  ]);
  expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(themeBox!.x);
  expect(offlineBox!.y).toBeGreaterThanOrEqual(
    Math.max(brandBox!.y + brandBox!.height, themeBox!.y + themeBox!.height),
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("Home resumes the newest valid incomplete destination across the Course Catalog", async ({
  page,
}) => {
  await page.evaluate(() => {
    localStorage.setItem(
      "prosto-courses:progress:v1",
      JSON.stringify({
        courses: {
          markdown: {
            destinations: {
              "lesson:vvedenie": { state: "started", visitedAt: 10 },
              "lesson:formatting": {
                state: "completed",
                visitedAt: 15,
                completedRevision: 1,
              },
              "capstone:capstone": {
                state: "completed",
                visitedAt: 40,
              },
              "lesson:retired": { state: "started", visitedAt: 100 },
            },
          },
          "accessible-images": {
            destinations: {
              "checkpoint:alt-text": { state: "started", visitedAt: 30 },
            },
          },
        },
      }),
    );
  });
  await page.reload();

  const resume = page.getByRole("region", {
    name: "Продолжить обучение",
  });
  await expect(resume).toContainText("Writing useful alt text");
  await expect(resume).toContainText("Purposeful image descriptions");
  await expect(
    resume.getByRole("heading", {
      level: 1,
      name: "Review an image description",
    }),
  ).toBeVisible();
  await expect(resume).toContainText("3 из 4");
  await expect(resume).toContainText("10 мин");
  await expect(
    resume.getByRole("link", { name: "Продолжить проверку" }),
  ).toHaveAttribute(
    "href",
    /\/courses\/accessible-images\/modules\/alt-text\/checkpoint\/$/,
  );

  const catalog = page.getByRole("list", { name: "Каталог курсов" });
  await expect(
    catalog.getByRole("listitem").filter({ hasText: "Основы Markdown" }),
  ).toContainText("2 из 10 завершено");
  await expect(
    catalog
      .getByRole("listitem")
      .filter({ hasText: "Основы Markdown" })
      .getByRole("list", {
        name: "Компактный маршрут курса: Основы Markdown",
      }),
  ).toContainText(
    "Заголовки, выделение и списки: Завершено · материал обновлён — повтори",
  );
  await expect(
    catalog
      .getByRole("listitem")
      .filter({ hasText: "Writing useful alt text" }),
  ).toContainText("0 из 4 завершено");
});

test("theme follows the system before paint and persists an explicit choice", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const firstFrameTheme = new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve({
          theme: document.documentElement.dataset.theme,
          mode: document.documentElement.dataset.themeMode,
          themeColor: document
            .querySelector('meta[name="theme-color"]')
            ?.getAttribute("content"),
        });
      });
    });
    Object.defineProperty(window, "__firstFrameTheme", {
      configurable: true,
      value: firstFrameTheme,
    });
  });

  const firstFrameTheme = () =>
    page.evaluate(() => {
      const instrumentedWindow = window as typeof window & {
        __firstFrameTheme: Promise<{
          theme?: string;
          mode?: string;
          themeColor?: string | null;
        }>;
      };
      return instrumentedWindow.__firstFrameTheme;
    });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();

  expect(await firstFrameTheme()).toEqual({
    theme: "dark",
    mode: "system",
    themeColor: "#09090B",
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-mode",
    "system",
  );
  await expect(
    page.getByRole("combobox", { name: "Тема оформления" }),
  ).toHaveValue("system");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#09090B",
  );

  await page
    .getByRole("combobox", { name: "Тема оформления" })
    .selectOption("light");
  await page.goto("./courses/markdown/lessons/vvedenie/");

  expect(await firstFrameTheme()).toEqual({
    theme: "light",
    mode: "light",
    themeColor: "#FAFAFA",
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-mode",
    "light",
  );
  await expect(
    page.getByRole("combobox", { name: "Тема оформления" }),
  ).toHaveValue("light");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#FAFAFA",
  );
});

test("visual foundation uses the exact palettes and typography roles", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/vvedenie/");

  const themeControl = page.getByRole("combobox", {
    name: "Тема оформления",
  });
  await expect(themeControl.locator("option")).toHaveText([
    "Системная",
    "Светлая",
    "Тёмная",
  ]);

  const brand = page.getByRole("link", { name: "Prosto.Courses" });
  const offlineState = page.getByRole("group", { name: "Офлайн-доступ" });
  const lessonPosition = page.getByText("Урок 1 из 2", { exact: true });
  const code = page.locator("main code").first();

  const themes = [
    {
      mode: "light",
      canvas: "rgb(250, 250, 250)",
      surface: "rgb(255, 255, 255)",
      ink: "rgb(24, 24, 27)",
      muted: "rgb(113, 113, 122)",
      border: "rgb(228, 228, 231)",
      focus: "rgb(63, 63, 70)",
    },
    {
      mode: "dark",
      canvas: "rgb(9, 9, 11)",
      surface: "rgb(24, 24, 27)",
      ink: "rgb(250, 250, 250)",
      muted: "rgb(161, 161, 170)",
      border: "rgb(39, 39, 42)",
      focus: "rgb(212, 212, 216)",
    },
  ] as const;

  for (const theme of themes) {
    await themeControl.selectOption(theme.mode);
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme.mode,
    );
    await brand.focus();

    const presentation = await brand.evaluate((brandElement) => {
      const body = getComputedStyle(document.body);
      const offline = getComputedStyle(
        document.querySelector('[aria-label="Офлайн-доступ"]')!,
      );
      const brandStyle = getComputedStyle(brandElement);
      return {
        canvas: body.backgroundColor,
        surface: offline.backgroundColor,
        ink: body.color,
        muted: offline.color,
        border: offline.borderTopColor,
        focus: brandStyle.outlineColor,
      };
    });

    expect(presentation).toEqual({
      canvas: theme.canvas,
      surface: theme.surface,
      ink: theme.ink,
      muted: theme.muted,
      border: theme.border,
      focus: theme.focus,
    });
  }

  await expect(page.locator("body")).toHaveCSS("font-family", /Onest/);
  await expect(code).toHaveCSS("font-family", /IBM Plex Mono/);
  await expect(lessonPosition).toHaveCSS("font-family", /IBM Plex Mono/);
  await expect(offlineState).toHaveCSS("font-family", /IBM Plex Mono/);
});

test("thin learner Header exposes shared controls on every learner route", async ({
  page,
}) => {
  const routes = [
    "./",
    "./courses/markdown/",
    "./courses/markdown/modules/osnovy/",
    "./courses/markdown/lessons/vvedenie/",
    "./courses/markdown/modules/osnovy/checkpoint/",
    "./courses/markdown/capstone/",
    "./offline/",
  ];

  await page.setViewportSize({ width: 1280, height: 900 });
  await page
    .getByRole("combobox", { name: "Тема оформления" })
    .selectOption("dark");

  for (const route of routes) {
    await page.goto(route);

    const header = page.getByRole("banner");
    await expect(
      header.getByRole("link", { name: "Prosto.Courses" }),
    ).toBeVisible();
    await expect(
      header.getByRole("link", { name: "Каталог", exact: true }),
    ).toBeVisible();
    await expect(
      header.getByRole("combobox", { name: "Тема оформления" }),
    ).toHaveValue("dark");
    await expect(
      header.getByRole("group", { name: "Офлайн-доступ" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme-mode",
      "dark",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(64);
  }
});

test("Lesson keeps the Course route persistent on desktop and accessible in a mobile drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("./courses/markdown/lessons/source-render/");

  const courseRoute = page.getByRole("navigation", {
    name: "Навигация по курсу",
  });
  const current = courseRoute.getByRole("link", {
    name: /Как читать Markdown-исходник/,
  });
  await expect(current).toHaveAttribute("aria-current", "page");
  await expect(
    courseRoute.getByRole("link", { name: /Проверка Модуля/ }).first(),
  ).toBeEnabled();
  await expect(
    courseRoute.getByRole("link", { name: /Итоговая работа/ }),
  ).toBeEnabled();

  const desktopGeometry = await page.evaluate(() => {
    const route = document
      .querySelector('[aria-label="Навигация по курсу"]')!
      .getBoundingClientRect();
    const article = document.querySelector("main article")!.getBoundingClientRect();
    return {
      routeWidth: route.width,
      routeRight: route.right,
      articleLeft: article.left,
      articleWidth: article.width,
    };
  });
  expect(desktopGeometry.routeWidth).toBeGreaterThanOrEqual(270);
  expect(desktopGeometry.routeWidth).toBeLessThanOrEqual(310);
  expect(desktopGeometry.articleLeft).toBeGreaterThan(
    desktopGeometry.routeRight,
  );
  expect(desktopGeometry.articleWidth).toBeGreaterThanOrEqual(780);
  expect(desktopGeometry.articleWidth).toBeLessThanOrEqual(840);

  await page.setViewportSize({ width: 390, height: 844 });
  const header = page.getByRole("banner");
  const toggle = page.getByRole("button", {
    name: "Открыть маршрут курса",
  });
  const mobileTitle = header.getByText("Как читать Markdown-исходник", {
    exact: true,
  });
  await expect(mobileTitle).toHaveCSS("text-overflow", "ellipsis");
  await expect(
    header.getByRole("combobox", { name: "Тема оформления" }),
  ).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const mobileArticleBefore = await page.locator("main article").boundingBox();
  await toggle.click();

  const drawer = page.getByRole("dialog", { name: "Маршрут курса" });
  const close = drawer.getByRole("button", {
    name: "Закрыть маршрут курса",
  });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(close).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect
    .poll(async () => (await drawer.boundingBox())!.x)
    .toBeGreaterThanOrEqual(0);
  const [mobileArticleDuring, drawerBox] = await Promise.all([
    page.locator("main article").boundingBox(),
    drawer.boundingBox(),
  ]);
  expect(mobileArticleDuring!.x).toBeCloseTo(mobileArticleBefore!.x);
  expect(mobileArticleDuring!.width).toBeCloseTo(mobileArticleBefore!.width);
  expect(drawerBox!.x).toBeGreaterThanOrEqual(0);
  expect(drawerBox!.x + drawerBox!.width).toBeLessThanOrEqual(390);

  await page.keyboard.press("Shift+Tab");
  await expect(drawer.getByRole("link").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await close.click();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await toggle.click();
  await expect(drawer).toHaveCSS("transition-duration", "0s");
  await page.keyboard.press("Escape");

  await toggle.click();
  await page.mouse.click(385, 200);
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);

  await page.setViewportSize({ width: 320, height: 700 });
  const [toggleBox, titleBox, narrowThemeBox] = await Promise.all([
    toggle.boundingBox(),
    mobileTitle.boundingBox(),
    header
      .getByRole("combobox", { name: "Тема оформления" })
      .boundingBox(),
  ]);
  expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(titleBox!.x);
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(narrowThemeBox!.x);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test("Lesson keeps 18px prose within a restrained reading measure", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./courses/markdown/lessons/vvedenie/");

  const firstParagraph = page.getByText(
    /Представь инструкцию из двадцати строк/,
  );
  const readingGeometry = await firstParagraph.evaluate((paragraph) => {
    const prose = paragraph.parentElement!;
    const style = getComputedStyle(paragraph);
    const characterMeasure = document.createElement("span");
    characterMeasure.style.position = "absolute";
    characterMeasure.style.visibility = "hidden";
    characterMeasure.textContent = "0";
    prose.append(characterMeasure);
    const characterWidth = characterMeasure.getBoundingClientRect().width;
    characterMeasure.remove();
    return {
      fontSize: Number.parseFloat(style.fontSize),
      lineMeasure: prose.getBoundingClientRect().width / characterWidth,
    };
  });

  expect(readingGeometry.fontSize).toBe(18);
  expect(readingGeometry.lineMeasure).toBeGreaterThanOrEqual(65);
  expect(readingGeometry.lineMeasure).toBeLessThanOrEqual(70);
});

test("Lesson heading keeps meaningful content in the first desktop viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./courses/markdown/lessons/formatting/");

  const heading = page.getByRole("heading", {
    level: 1,
    name: "Заголовки, выделение и списки",
  });
  const firstContentHeading = page.getByRole("heading", {
    level: 2,
    name: "Заголовки создают структуру",
  });
  expect(
    Number.parseFloat(await heading.evaluate((element) =>
      getComputedStyle(element).fontSize)),
  ).toBeLessThanOrEqual(72);
  expect((await firstContentHeading.boundingBox())!.y).toBeLessThan(900);
});

test("Lesson groups capability, route position, workload, and progress as utility information", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/source-render/");

  const utility = page.getByRole("group", {
    name: "Сведения об Уроке",
  });
  await expect(utility).toContainText(
    "Различать блочные конструкции и элементы внутри строки по Markdown-исходнику",
  );
  await expect(utility).toContainText("Маршрут: 2 из 10");
  await expect(
    utility.getByRole("group", { name: "Время на Урок" }),
  ).toContainText("Изучение10 мин");
  await expect(
    utility.getByLabel("Статус урока: В процессе"),
  ).toBeVisible();
});

test("every learning destination shares the same Course route semantics", async ({
  page,
}) => {
  const destinations = [
    {
      path: "./courses/markdown/modules/osnovy/",
      current: "От исходника к структуре",
    },
    {
      path: "./courses/markdown/modules/osnovy/checkpoint/",
      current: /Проверка Модуля: Объясни путь от исходника к документу/,
    },
    {
      path: "./courses/markdown/capstone/",
      current: /Итоговая работа: Понятная инструкция в Markdown/,
    },
  ] as const;

  for (const destination of destinations) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(destination.path);
    const route = page.getByRole("navigation", {
      name: "Навигация по курсу",
    });
    await expect(
      route.getByRole("link", { name: destination.current }),
    ).toHaveAttribute("aria-current", "page");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("button", { name: "Открыть маршрут курса" }),
    ).toBeVisible();
  }
});

test("Lesson sequence crosses Module boundaries through the prior Checkpoint", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/formatting/");

  await expect(
    page.getByRole("navigation", { name: "Последовательность уроков" })
      .getByRole("link", {
        name: /Предыдущая проверка Модуля: Объясни путь от исходника к документу/,
      }),
  ).toHaveAttribute(
    "href",
    /\/courses\/markdown\/modules\/osnovy\/checkpoint\/$/,
  );
});

test("Course Overview makes the next action and complete route primary", async ({
  page,
}) => {
  await page.goto("./courses/markdown/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Основы Markdown" }),
  ).toBeVisible();
  await expect(page.getByLabel("Прогресс курса")).toHaveText(
    "0 из 10 завершено",
  );
  await expect(
    page.getByRole("link", { name: "Начать", exact: true }),
  ).toHaveCount(1);

  const route = page.getByRole("navigation", { name: "Маршрут курса" });
  const routeLinks = route.getByRole("link");
  await expect(routeLinks).toHaveCount(13);
  expect(
    await routeLinks.evaluateAll((links) =>
      links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
    ),
  ).toEqual([
    "/prosto-courses/courses/markdown/modules/osnovy/",
    "/prosto-courses/courses/markdown/lessons/vvedenie/",
    "/prosto-courses/courses/markdown/lessons/source-render/",
    "/prosto-courses/courses/markdown/modules/osnovy/checkpoint/",
    "/prosto-courses/courses/markdown/modules/struktura/",
    "/prosto-courses/courses/markdown/lessons/formatting/",
    "/prosto-courses/courses/markdown/lessons/links-code/",
    "/prosto-courses/courses/markdown/modules/struktura/checkpoint/",
    "/prosto-courses/courses/markdown/modules/proverka/",
    "/prosto-courses/courses/markdown/lessons/portability/",
    "/prosto-courses/courses/markdown/lessons/review/",
    "/prosto-courses/courses/markdown/modules/proverka/checkpoint/",
    "/prosto-courses/courses/markdown/capstone/",
  ]);
  const firstLesson = route.getByRole("link", {
    name: /Знакомство с Markdown/,
  });
  await expect(firstLesson).toHaveAccessibleName(
    /^Урок 1: Знакомство с Markdown/,
  );
  await expect(
    route.getByRole("link", {
      name: /Заголовки, выделение и списки/,
    }),
  ).toHaveAccessibleName(/^Урок 3: Заголовки, выделение и списки/);
  await expect(
    route.getByRole("link", {
      name: /Итоговая работа: Понятная инструкция в Markdown/,
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Начать", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    route.getByRole("link", { name: "От исходника к структуре", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(firstLesson).toBeFocused();

  const order = await page.evaluate(() => {
    const action = document.querySelector("[data-course-action]")!;
    const route = document.querySelector('[aria-label="Маршрут курса"]')!;
    const outcomes = [...document.querySelectorAll("h2")].find(
      (heading) => heading.textContent === "Чему ты научишься",
    )!;
    return {
      actionBeforeRoute:
        Boolean(action.compareDocumentPosition(route) &
          Node.DOCUMENT_POSITION_FOLLOWING),
      routeBeforeOutcomes:
        Boolean(route.compareDocumentPosition(outcomes) &
          Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  expect(order).toEqual({
    actionBeforeRoute: true,
    routeBeforeOutcomes: true,
  });
});

test("Semantic Course Components express learning function in the dark theme", async ({
  page,
}) => {
  await page
    .getByRole("combobox", { name: "Тема оформления" })
    .selectOption("dark");
  await page.goto("./courses/markdown/lessons/vvedenie/");

  const callout = page.getByRole("complementary", {
    name: "Ключевая мысль",
  });
  const knowledgeCheck = page.locator("form").filter({
    hasText: "Проверь себя",
  });
  const diagram = page.getByRole("figure", {
    name: "Как Markdown становится страницей",
  });
  const presentation = await page.evaluate(() => {
    const style = (selector: string) =>
      getComputedStyle(document.querySelector(selector)!);
    const body = getComputedStyle(document.body);
    const callout = style('[aria-label="Ключевая мысль"]');
    const check = style("form");
    const diagram = style(
      'figure[aria-label="Как Markdown становится страницей"]',
    );
    const code = style("main code");
    return {
      bodyBackground: body.backgroundColor,
      calloutBackground: callout.backgroundColor,
      calloutLeft: callout.borderLeftWidth,
      calloutTop: callout.borderTopWidth,
      checkBackground: check.backgroundColor,
      checkBorder: check.borderTopWidth,
      diagramBackground: diagram.backgroundColor,
      diagramBorder: diagram.borderTopWidth,
      codeFont: code.fontFamily,
    };
  });

  await expect(callout).toBeVisible();
  await expect(knowledgeCheck).toBeVisible();
  await expect(diagram).toBeVisible();
  expect(presentation.calloutBackground).toBe("rgba(0, 0, 0, 0)");
  expect(presentation.calloutLeft).toBe("2px");
  expect(presentation.calloutTop).toBe("0px");
  expect(presentation.checkBackground).toBe("rgb(24, 24, 27)");
  expect(presentation.checkBorder).toBe("1px");
  expect(presentation.diagramBackground).toBe("rgba(0, 0, 0, 0)");
  expect(presentation.diagramBorder).toBe("0px");
  expect(presentation.codeFont).toContain("IBM Plex Mono");

  await page.goto("./courses/markdown/lessons/formatting/");
  const practice = page.getByRole("region", {
    name: "Собери структуру заметки",
  });
  const reflection = page.getByRole("region", {
    name: "Как изменился бы твой способ оформлять заметку после этого урока?",
  });
  for (const bounded of [practice, reflection]) {
    await expect(bounded).toHaveCSS("background-color", "rgb(24, 24, 27)");
    await expect(bounded).toHaveCSS("border-top-width", "1px");
  }
});

test("Home keeps the static Course Catalog usable when local progress is unusable", async ({
  page,
}) => {
  for (const stored of [
    "{broken",
    JSON.stringify({
      courses: {
        markdown: {
          destinations: {
            "lesson:retired": { state: "started", visitedAt: 100 },
            "lesson:vvedenie": { state: "completed", visitedAt: 20 },
          },
        },
      },
    }),
  ]) {
    await page.evaluate((value) => {
      localStorage.setItem("prosto-courses:progress:v1", value);
    }, stored);
    await page.reload();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Выбери Курс и начни с первого Урока.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Каталог курсов" }),
    ).toBeVisible();
  }

  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      configurable: true,
      value() {
        throw new DOMException("Storage denied", "SecurityError");
      },
    });
  });
  await page.goto("./");
  await expect(
    page.getByRole("list", { name: "Каталог курсов" }),
  ).toBeVisible();
});

test("Home shows completed-only progress without inventing a Resume Destination", async ({
  page,
}) => {
  await page.evaluate(() => {
    const destinationIds = [
      "lesson:vvedenie",
      "lesson:source-render",
      "checkpoint:osnovy",
      "lesson:formatting",
      "lesson:links-code",
      "checkpoint:struktura",
      "lesson:portability",
      "lesson:review",
      "checkpoint:proverka",
      "capstone:capstone",
    ];
    localStorage.setItem(
      "prosto-courses:progress:v1",
      JSON.stringify({
        courses: {
          markdown: {
            destinations: Object.fromEntries(
              destinationIds.map((id, index) => [
                id,
                { state: "completed", visitedAt: index + 1 },
              ]),
            ),
          },
        },
      }),
    );
  });
  await page.reload();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Выбери Курс и начни с первого Урока.",
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Каталог курсов" })
      .getByRole("listitem")
      .filter({ hasText: "Основы Markdown" }),
  ).toContainText("✓ Курс завершён · 10 из 10 завершено");
});

test("Home names and navigates directly to every Resume Destination kind", async ({
  page,
}) => {
  const destinations = [
    {
      course: "markdown",
      courseTitle: "Основы Markdown",
      id: "lesson:formatting",
      title: "Заголовки, выделение и списки",
      module: "Структура рабочей инструкции",
      position: 4,
      total: 10,
      minutes: 20,
      action: "Продолжить Урок",
      href: /\/courses\/markdown\/lessons\/formatting\/$/,
    },
    {
      course: "accessible-images",
      courseTitle: "Writing useful alt text",
      id: "checkpoint:alt-text",
      title: "Review an image description",
      module: "Purposeful image descriptions",
      position: 3,
      total: 4,
      minutes: 10,
      action: "Продолжить проверку",
      href:
        /\/courses\/accessible-images\/modules\/alt-text\/checkpoint\/$/,
    },
    {
      course: "markdown",
      courseTitle: "Основы Markdown",
      id: "capstone:capstone",
      title: "Понятная инструкция в Markdown",
      module: null,
      position: 10,
      total: 10,
      minutes: 45,
      action: "Продолжить итоговую работу",
      href: /\/courses\/markdown\/capstone\/$/,
    },
  ] as const;

  for (const destination of destinations) {
    await page.evaluate(({ course, id }) => {
      localStorage.setItem(
        "prosto-courses:progress:v1",
        JSON.stringify({
          courses: {
            [course]: {
              destinations: {
                [id]: { state: "started", visitedAt: 10 },
              },
            },
          },
        }),
      );
    }, destination);
    await page.goto("./");
    const resume = page.getByRole("region", {
      name: "Продолжить обучение",
    });
    await expect(
      resume.getByRole("heading", {
        level: 1,
        name: destination.title,
      }),
    ).toBeVisible();
    await expect(resume).toContainText(`Курс: ${destination.courseTitle}`);
    if (destination.module) {
      await expect(resume).toContainText(`Модуль: ${destination.module}`);
    } else {
      await expect(resume).not.toContainText("Модуль:");
    }
    await expect(resume).toContainText(
      `Маршрут: ${destination.position} из ${destination.total}`,
    );
    await expect(resume).toContainText(`Время: ${destination.minutes} мин`);
    await expect(resume).toContainText(
      `Завершено: 0 из ${destination.total}`,
    );

    await resume.getByRole("link", { name: destination.action }).click();
    await expect(page).toHaveURL(destination.href);
  }
});

test("learner shell requests only local assets and removes motion when requested", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./courses/markdown/lessons/vvedenie/");

  const origin = new URL(page.url()).origin;
  expect(
    requests.filter((url) => new URL(url).origin !== origin),
  ).toEqual([]);
  await expect(page.locator("[data-course-route-panel]")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await expect(page.locator("[data-course-progress-line]")).toHaveCSS(
    "transition-duration",
    "0s",
  );
});
