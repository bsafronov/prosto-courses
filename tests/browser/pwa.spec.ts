import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { siteBasePath, siteOrigin } from "../../site.config.mjs";

test.use({ serviceWorkers: "allow" });

interface ReleaseInventory {
  releaseUrls: string[];
  routes: string[];
}

function fixtureServerUrl(baseURL: string | undefined, pathname: string) {
  if (!baseURL) throw new Error("Playwright baseURL is required");
  return new URL(pathname, baseURL).href;
}

async function getReleaseInventory(
  baseURL: string | undefined,
  request: APIRequestContext,
) {
  const response = await request.get(
    fixtureServerUrl(baseURL, "/__test__/release"),
  );
  expect(response.ok()).toBe(true);
  return (await response.json()) as ReleaseInventory;
}

async function expectControlledRelease(page: Page, scopeUrl: string) {
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return {
          controller: navigator.serviceWorker.controller?.scriptURL,
          scope: registration?.scope,
        };
      }),
    )
    .toEqual({
      controller: new URL("sw.js", scopeUrl).href,
      scope: scopeUrl,
    });
}

async function expectActiveRelease(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration =
            await navigator.serviceWorker.getRegistration();
          return registration?.active?.state;
        }),
      { timeout: 20_000 },
    )
    .toBe("activated");
}

async function expectQuietInstall(page: Page) {
  await expectActiveRelease(page);
  const control = page.getByRole("group", {
    name: "Приложение и офлайн-доступ",
  });
  await expect(
    control.getByText("Подготовка офлайн", { exact: true }),
  ).toBeHidden();
  await expect(
    control.getByRole("button", { name: "Установить", exact: true }),
  ).toBeVisible();
  await expect(control).not.toContainText("Доступно офлайн");
  return control;
}

async function unavailableReleaseUrls(page: Page, releaseUrls: string[]) {
  return page.evaluate(async (urls) => {
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url);
          return response.ok ? undefined : `${url}: ${response.status}`;
        } catch (error) {
          return `${url}: ${String(error)}`;
        }
      }),
    );
    return results.filter(Boolean);
  }, releaseUrls);
}

async function pageAssetUrls(page: Page) {
  return page.evaluate(() => {
    const urls = new Set(
      performance
        .getEntriesByType("resource")
        .map((entry) => entry.name),
    );
    for (const element of document.querySelectorAll<
      HTMLLinkElement | HTMLScriptElement | HTMLImageElement
    >("link[href], script[src], img[src]")) {
      const url =
        element instanceof HTMLLinkElement
          ? element.href
          : element instanceof HTMLScriptElement
            ? element.src
            : element.currentSrc || element.src;
      if (url) urls.add(url);
    }
    return [...urls].filter((url) => new URL(url).origin === location.origin);
  });
}

async function expectOfflineFallback(
  page: Page,
  unavailableUrl: string,
  catalogHref: string,
) {
  await page.goto(unavailableUrl);
  await expect(
    page.getByRole("heading", { name: "Эта страница не сохранена" }),
  ).toBeVisible();
  const catalog = page.getByRole("link", { name: "Перейти в Каталог курсов" });
  await expect(catalog).toHaveAttribute("href", catalogHref);
  await catalog.click();
  await expect(page.getByRole("list", { name: "Каталог курсов" })).toBeVisible();
}

test.beforeEach(async ({ baseURL, request }) => {
  const response = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/1"),
  );
  expect(response.ok()).toBe(true);
});

test("the deployable release exposes install identity under the configured base path", async ({
  page,
}) => {
  await page.goto("./");

  const manifestUrl = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestUrl).toBe("/prosto-courses/manifest.webmanifest");

  const manifestResponse = await page.request.get(manifestUrl!);
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()["content-type"]).toContain(
    "application/manifest+json",
  );
  const manifest = await manifestResponse.json();

  expect(manifest).toMatchObject({
    name: "Prosto.Courses",
    short_name: "Курсы",
    lang: "ru",
    display: "standalone",
    start_url: "/prosto-courses/",
    scope: "/prosto-courses/",
    theme_color: "#18181b",
  });
  expect(manifest.orientation).toBeUndefined();
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        src: "/prosto-courses/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      }),
      expect.objectContaining({
        src: "/prosto-courses/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      }),
      expect.objectContaining({
        src: "/prosto-courses/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      }),
    ]),
  );

  const inspectImage = (imageUrl: string) =>
    page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      const centre = canvas.width / 2;
      const safeRadius = canvas.width * 0.4;
      let brandPixels = 0;
      let whiteOutsideSafeCircle = 0;
      let whitePixels = 0;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const offset = (y * canvas.width + x) * 4;
          const isWhite =
            pixels[offset] > 240 &&
            pixels[offset + 1] > 240 &&
            pixels[offset + 2] > 240 &&
            pixels[offset + 3] > 240;
          const isBrand =
            Math.abs(pixels[offset] - 0x33) <= 2 &&
            Math.abs(pixels[offset + 1] - 0x47) <= 2 &&
            Math.abs(pixels[offset + 2] - 0xa8) <= 2 &&
            pixels[offset + 3] > 240;
          if (isBrand) brandPixels += 1;
          if (!isWhite) continue;
          whitePixels += 1;
          if (Math.hypot(x - centre, y - centre) > safeRadius) {
            whiteOutsideSafeCircle += 1;
          }
        }
      }
      return {
        brandPixels,
        height: image.naturalHeight,
        whiteOutsideSafeCircle,
        whitePixels,
        width: image.naturalWidth,
      };
    }, imageUrl);

  for (const icon of manifest.icons) {
    const response = await page.request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain(icon.type);
    const expectedSize = Number(icon.sizes.split("x")[0]);
    const identity = await inspectImage(icon.src);
    expect(identity).toMatchObject({ height: expectedSize, width: expectedSize });
    expect(identity.brandPixels).toBeGreaterThan(expectedSize ** 2 * 0.25);
    expect(identity.whitePixels).toBeGreaterThan(expectedSize ** 2 * 0.01);
    if (icon.purpose === "maskable") {
      expect(identity.whiteOutsideSafeCircle).toBe(0);
    }
  }

  const svgIcon = page.locator('link[rel="icon"][type="image/svg+xml"]');
  await expect(svgIcon).toHaveAttribute(
    "href", "/prosto-courses/favicon.svg",
  );
  await expect(svgIcon).toHaveAttribute("sizes", "any");
  const appleIcon = page.locator('link[rel="apple-touch-icon"]');
  await expect(appleIcon).toHaveAttribute(
    "href", "/prosto-courses/apple-touch-icon-180x180.png",
  );
  await expect(appleIcon).toHaveAttribute("sizes", "180x180");
  const linkedAssets = [
    {
      size: 512,
      type: "image/svg+xml",
      url: await svgIcon.getAttribute("href"),
    },
    {
      size: 48,
      type: "image/x-icon",
      url: await page
        .locator('link[rel="icon"][sizes="48x48"]')
        .getAttribute("href"),
    },
    {
      size: 180,
      type: "image/png",
      url: await appleIcon.getAttribute("href"),
    },
  ];
  for (const asset of linkedAssets) {
    expect(asset.url).toBeTruthy();
    const response = await page.request.get(asset.url!);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain(asset.type);
    const identity = await inspectImage(asset.url!);
    expect(identity).toMatchObject({
      height: asset.size,
      width: asset.size,
    });
    expect(identity.brandPixels).toBeGreaterThan(asset.size ** 2 * 0.25);
    expect(identity.whitePixels).toBeGreaterThan(asset.size ** 2 * 0.01);
  }
});

test("the deployable release exposes root-scoped install identity", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4323/");

  const manifestUrl = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestUrl).toBe("/manifest.webmanifest");

  const manifestResponse = await page.request.get(
    new URL(manifestUrl!, page.url()).href,
  );
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()["content-type"]).toContain(
    "application/manifest+json",
  );
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: "Prosto.Courses",
    short_name: "Курсы",
    lang: "ru",
    display: "standalone",
    start_url: "/",
    scope: "/",
    theme_color: "#18181b",
    icons: expect.arrayContaining([
      expect.objectContaining({ src: "/pwa-192x192.png" }),
      expect.objectContaining({ src: "/pwa-512x512.png" }),
      expect.objectContaining({ src: "/maskable-icon-512x512.png" }),
    ]),
  });
});

test("the root-deployed release remains complete and scoped offline", async ({
  browser,
  page,
}) => {
  const rootUrl = "http://127.0.0.1:4323/";
  const routesResponse = await page.request.get(
    new URL("__test__/routes", rootUrl).href,
  );
  expect(routesResponse.ok()).toBe(true);
  const { routes } = (await routesResponse.json()) as { routes: string[] };

  const assets = new Set<string>();
  const routeHeadings = new Map<string, string>();
  for (const route of routes) {
    await page.goto(new URL(route, rootUrl).href);
    await expect(page.locator("main")).not.toBeEmpty();
    const heading = (
      await page.locator("h1:visible").first().textContent()
    )?.trim();
    expect(heading).toBeTruthy();
    routeHeadings.set(route, heading!);
    const diagrams = page.locator("[data-mermaid-container]");
    if ((await diagrams.count()) > 0) {
      await expect(diagrams.first()).toHaveAttribute(
        "data-mermaid-rendered",
        "true",
      );
    }
    for (const assetUrl of await pageAssetUrls(page)) assets.add(assetUrl);
  }
  const manifestUrl = new URL(
    (await page.locator('link[rel="manifest"]').getAttribute("href"))!,
    rootUrl,
  ).href;
  const manifestResponse = await page.request.get(manifestUrl);
  expect(manifestResponse.ok()).toBe(true);
  assets.add(manifestUrl);
  const manifest = (await manifestResponse.json()) as {
    icons: { src: string }[];
  };
  for (const icon of manifest.icons) {
    assets.add(new URL(icon.src, rootUrl).href);
  }
  expect(routes.length).toBeGreaterThan(2);
  expect(assets.size).toBeGreaterThan(5);
  for (const assetUrl of assets) {
    const parsed = new URL(assetUrl);
    expect(parsed.origin).toBe(new URL(rootUrl).origin);
    expect(parsed.pathname).not.toMatch(/^\/prosto-courses(?:\/|$)/);
  }
  await expect(unavailableReleaseUrls(page, [...assets])).resolves.toEqual([]);

  const offlineContext = await browser.newContext({ serviceWorkers: "allow" });
  const offlinePage = await offlineContext.newPage();
  try {
    await offlinePage.goto(rootUrl);
    await expectActiveRelease(offlinePage);
    await expectControlledRelease(offlinePage, rootUrl);
    await offlineContext.setOffline(true);

    for (const route of routes) {
      await offlinePage.goto(new URL(route, rootUrl).href);
      await expect(
        offlinePage.locator("h1:visible").first(),
      ).toHaveText(routeHeadings.get(route)!);
      await expect(
        offlinePage.getByRole("heading", {
          name: "Эта страница не сохранена",
        }),
      ).toHaveCount(0);
    }
    await expect(
      unavailableReleaseUrls(offlinePage, [...assets]),
    ).resolves.toEqual([]);
    await expectOfflineFallback(
      offlinePage,
      new URL("courses/removed-from-release/", rootUrl).href,
      "/",
    );
  } finally {
    await offlineContext.close();
  }
});

test("the header reports complete Offline Availability and recovers unknown routes offline", async ({
  baseURL,
  context,
  page,
  request,
}) => {
  const release = await getReleaseInventory(baseURL, request);
  const expectedScope = fixtureServerUrl(baseURL, "./");
  const workerErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      workerErrors.push(`page error: ${message.text()}`);
    }
  });
  context.on("serviceworker", (worker) => {
    worker.on("console", (message) => {
      workerErrors.push(`${message.type()}: ${message.text()}`);
    });
  });
  const devtools = await context.newCDPSession(page);
  await devtools.send("ServiceWorker.enable");
  devtools.on("ServiceWorker.workerErrorReported", (event) => {
    workerErrors.push(JSON.stringify(event.errorMessage));
  });
  await page.goto("./");

  const control = page.getByRole("group", {
    name: "Приложение и офлайн-доступ",
  });
  const status = control.locator('[aria-live="polite"]');
  await expect(control).toBeVisible();
  await expect(status).toHaveAttribute("aria-atomic", "true");
  await expectQuietInstall(page);
  expect(workerErrors).toEqual([]);

  await expectControlledRelease(page, expectedScope);

  await context.setOffline(true);
  await expect(control).toBeHidden();

  for (const route of release.routes) {
    await page.goto(route);
    await expect(page.locator("main")).not.toBeEmpty();
    await expect(
      page.getByRole("group", { name: "Приложение и офлайн-доступ" }),
    ).toBeHidden();
  }

  await expect(unavailableReleaseUrls(page, release.releaseUrls)).resolves.toEqual(
    [],
  );

  await page.goto("./courses/markdown/lessons/vvedenie/");
  await expect(page.locator("[data-mermaid-container]")).toHaveAttribute(
    "data-mermaid-rendered",
    "true",
  );
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Проверить ответ" }).first().click();
  await expect(
    page.locator("[data-knowledge-check] [data-feedback]").first(),
  ).toBeVisible();

  await page.goto("./courses/markdown/lessons/formatting/");
  const practice = page.getByRole("region", {
    name: "Собери структуру заметки",
  });
  await practice
    .getByRole("button", { name: "Показать подсказку 1 из 2" })
    .click();
  await expect(
    practice.getByRole("list", { name: "Открытые подсказки" }),
  ).toContainText("Сначала назови главные части заметки.");
  const offlineDraft = "Этот черновик создан без подключения.";
  await page
    .getByRole("textbox", { name: "Твоя заметка" })
    .fill(offlineDraft);
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await expect(page.getByRole("textbox", { name: "Твоя заметка" })).toHaveValue(
    offlineDraft,
  );
  await expect(page.locator("[data-completion-toggle]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await expectOfflineFallback(
    page,
    "./courses/removed-from-release/",
    "/prosto-courses/",
  );
});

test("the global PWA control stays quiet when connectivity disappears", async ({
  baseURL,
  context,
  page,
  request,
}) => {
  const heldRelease = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/1?hold=1"),
  );
  expect(heldRelease.ok()).toBe(true);
  await page.goto("./");

  const control = page.getByRole("group", { name: "Приложение и офлайн-доступ" });
  await expect(
    control.getByText("Подготовка офлайн", { exact: true }),
  ).toBeVisible();

  await context.setOffline(true);
  await expect(control).toBeHidden();

  const released = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/1"),
  );
  expect(released.ok()).toBe(true);
  await context.setOffline(false);
  await expectQuietInstall(page);
});

test("preparing Offline Availability keeps focus stable through completion", async ({
  baseURL,
  page,
  request,
}) => {
  const heldRelease = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/1?hold=1"),
  );
  expect(heldRelease.ok()).toBe(true);
  await page.goto("./");

  const control = page.getByRole("group", { name: "Приложение и офлайн-доступ" });
  const preparing = control.getByText("Подготовка офлайн", { exact: true });
  await expect(preparing).toBeVisible();
  const catalogLink = page.getByRole("link", { name: "Каталог" });
  await catalogLink.focus();
  await expect(catalogLink).toBeFocused();

  const released = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/1"),
  );
  expect(released.ok()).toBe(true);
  await expectQuietInstall(page);
  await expect(preparing).toBeHidden();
  await expect(catalogLink).toBeFocused();
});

test("data saving defers preparation until the learner accepts the measured release", async ({
  baseURL,
  context,
  page,
  request,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    });
  });
  await page.goto("./");

  const control = page.getByRole("group", { name: "Приложение и офлайн-доступ" });
  await expect(
    control.getByText("Офлайн по запросу", { exact: true }),
  ).toBeVisible();
  await expect(control).toContainText(
    /Экономия трафика включена.*Полный Каталог: \d+(?:[,.]\d)? МБ/,
  );
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);

  const { releaseUrls } = await getReleaseInventory(baseURL, request);
  const releaseResponses = await Promise.all(
    releaseUrls.map((url) =>
      request.get(fixtureServerUrl(baseURL, url)),
    ),
  );
  for (const response of releaseResponses) expect(response.ok()).toBe(true);
  const totalBytes = (
    await Promise.all(releaseResponses.map((response) => response.body()))
  ).reduce((total, body) => total + body.byteLength, 0);
  const metadataResponse = await request.get(
    fixtureServerUrl(baseURL, "/prosto-courses/offline-release.json"),
  );
  expect(metadataResponse.ok()).toBe(true);
  await expect(metadataResponse.json()).resolves.toEqual({
    fileCount: releaseUrls.length,
    totalBytes,
  });
  await expect(control).toContainText(
    `Полный Каталог: ${new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 1,
    }).format(totalBytes / 1024 / 1024)} МБ.`,
  );

  await control.getByRole("button", { name: "Скачать" }).click();
  await expectQuietInstall(page);
});

test("failed initial preparation never claims readiness and can be retried", async ({
  baseURL,
  page,
  request,
}) => {
  const failedRelease = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/1?fail=1"),
  );
  expect(failedRelease.ok()).toBe(true);
  await page.goto("./");

  const control = page.getByRole("group", { name: "Приложение и офлайн-доступ" });
  await expect(
    control.getByText("Офлайн не подготовлен", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(control).not.toContainText("Доступно офлайн");
  await expect(
    control.getByRole("button", { name: "Повторить" }),
  ).toHaveAccessibleDescription("Не удалось сохранить полный Каталог.");
  const stateResponse = await request.get(
    fixtureServerUrl(baseURL, "/__test__/state"),
  );
  expect((await stateResponse.json()).failedPrecacheRequestCount).toBeGreaterThan(
    0,
  );

  await page
    .getByRole("article", { name: "Основы Markdown" })
    .getByRole("link", { name: "Основы Markdown", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Основы Markdown" }),
  ).toBeVisible();
  await expect(
    control.getByText("Офлайн не подготовлен", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });

  const healthyRelease = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/1"),
  );
  expect(healthyRelease.ok()).toBe(true);
  await control.getByRole("button", { name: "Повторить" }).click();
  await expectQuietInstall(page);
});

test("a Catalog Update survives a failed attempt, waits for consent, and preserves learner data offline", async ({
  baseURL,
  context,
  page,
  request,
}) => {
  const lessonPath = "./courses/markdown/lessons/formatting/";
  const firstTitle = "Заголовки, выделение и списки";
  const secondTitle = `${firstTitle} — выпуск 2`;
  const reflectionPrompt =
    "Как изменился бы твой способ оформлять заметку после этого урока?";
  const draft = "Мой черновик должен пережить атомарное обновление.";

  await page.goto(lessonPath);

  const control = page.getByRole("group", { name: "Приложение и офлайн-доступ" });
  await expectQuietInstall(page);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await page
    .getByRole("region", { name: reflectionPrompt })
    .getByRole("textbox", { name: "Твоя заметка" })
    .fill(draft);
  await page.getByRole("button", { name: "Завершить урок" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: firstTitle, exact: true }),
  ).toBeVisible();

  await context.setOffline(true);
  const failedRelease = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/2?fail=1"),
  );
  expect(failedRelease.ok()).toBe(true);
  await context.setOffline(false);
  await expect
    .poll(
      async () => {
        const response = await request.get(
          fixtureServerUrl(baseURL, "/__test__/state"),
        );
        return (await response.json()).failedPrecacheRequestCount;
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);
  await expect(
    control.getByRole("button", { name: "Обновить" }),
  ).toHaveCount(0);
  await expectQuietInstall(page);
  await expect(
    page.getByRole("heading", { level: 1, name: firstTitle, exact: true }),
  ).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: firstTitle, exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: reflectionPrompt })
      .getByRole("textbox", { name: "Твоя заметка" }),
  ).toHaveValue(draft);
  const transientAnswer = page.getByRole("radio", {
    name: "**Раздел**",
  });
  await transientAnswer.check();

  const healthyRelease = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/2"),
  );
  expect(healthyRelease.ok()).toBe(true);
  await context.setOffline(false);

  const refreshedControl = page.getByRole("group", {
    name: "Приложение и офлайн-доступ",
  });
  const update = refreshedControl.getByRole("button", { name: "Обновить" });
  await expect(update).toBeVisible({ timeout: 20_000 });
  await expect(
    refreshedControl.getByText("Доступно обновление", { exact: true }),
  ).toBeVisible();
  await expect(update).toHaveAccessibleDescription(
    "Текущие несохранённые действия могут быть потеряны. После обновления откроется Каталог курсов.",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: firstTitle, exact: true }),
  ).toBeVisible();
  await expect(transientAnswer).toBeChecked();
  const siblingPage = await context.newPage();
  await siblingPage.goto(page.url());
  await expect(
    siblingPage.getByRole("heading", {
      level: 1,
      name: firstTitle,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    siblingPage
      .getByRole("group", { name: "Приложение и офлайн-доступ" })
      .getByRole("button", { name: "Обновить" }),
  ).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: firstTitle, exact: true }),
  ).toBeVisible();
  const offlineControl = page.getByRole("group", {
    name: "Приложение и офлайн-доступ",
  });
  const offlineUpdate = offlineControl.getByRole("button", {
    name: "Обновить",
  });
  await expect(
    offlineControl.getByText("Обновление готово офлайн", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(offlineUpdate).toBeEnabled();
  await offlineUpdate.click();
  await expect(page).toHaveURL(/\/prosto-courses\/$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", {
      name: "Выбери Курс и начни с первого Урока.",
    }),
  ).toBeVisible();
  await expect(siblingPage).toHaveURL(/\/prosto-courses\/$/, {
    timeout: 20_000,
  });
  await expect(
    siblingPage.getByRole("heading", {
      name: "Выбери Курс и начни с первого Урока.",
    }),
  ).toBeVisible();

  await page.goto(lessonPath);
  await expect(
    page.getByRole("heading", { level: 1, name: secondTitle, exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: reflectionPrompt })
      .getByRole("textbox", { name: "Твоя заметка" }),
  ).toHaveValue(draft);
  expect(
    await page.evaluate(() => {
      const progress = JSON.parse(
        localStorage.getItem("prosto-courses:progress:v1")!,
      );
      return progress.courses.markdown.destinations["lesson:formatting"]
        .completedRevision;
    }),
  ).toBe(3);
});

test("the quiet install action is keyboard-operable and follows installation lifecycle", async ({
  page,
}) => {
  await page.goto("./");

  const defaultPrevented = await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
      prompt: {
        value: async () => {
          (window as typeof window & { installPromptCalls?: number })
            .installPromptCalls =
            ((window as typeof window & { installPromptCalls?: number })
              .installPromptCalls ?? 0) + 1;
        },
      },
      userChoice: {
        value: Promise.resolve({ outcome: "dismissed" }),
      },
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });

  expect(defaultPrevented).toBe(true);
  const control = page.getByRole("group", { name: "Приложение и офлайн-доступ" });
  const install = control.getByRole("button", {
    name: "Установить",
    exact: true,
  });
  await expect(install).toBeVisible();
  await expectQuietInstall(page);
  await expect(control.locator(":scope > :visible")).toHaveCount(1);
  await expect(control).toHaveCSS("border-top-width", "0px");
  await install.focus();
  await expect(install).toBeFocused();
  await page.keyboard.press("Enter");
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { installPromptCalls?: number })
          .installPromptCalls,
    ),
  ).toBe(1);
  await expect(install).toBeVisible();
  await expect(install).toHaveAttribute("aria-expanded", "false");
  await install.click();
  await expect(install).toHaveAttribute("aria-expanded", "true");
  await expect(control).toContainText(
    "Открой меню браузера и выбери «Установить приложение».",
  );

  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(control).toBeHidden();
});

test("accepted native prompt waits for installation confirmation", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: async () => undefined },
      userChoice: {
        value: Promise.resolve({ outcome: "accepted" }),
      },
    });
    window.dispatchEvent(event);
  });

  const control = page.getByRole("group", { name: "Приложение и офлайн-доступ" });
  const install = control.getByRole("button", {
    name: "Установить",
    exact: true,
  });
  await install.click();
  await expect(install).toBeVisible();
  await expect(install).toBeDisabled();

  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(install).toBeHidden();
});

test("manual installation guidance stays in the compact control", async ({
  page,
}) => {
  await page.goto("./");

  const control = page.getByRole("group", {
    name: "Приложение и офлайн-доступ",
  });
  const install = control.getByRole("button", {
    name: "Установить",
    exact: true,
  });
  await expect(install).toHaveAttribute("aria-expanded", "false");
  await install.click();
  await expect(install).toHaveAttribute("aria-expanded", "true");
  const instructions = control.getByText(
    "Открой меню браузера и выбери «Установить приложение».",
    { exact: true },
  );
  await expect(instructions).toBeVisible();
  await install.click();
  await expect(install).toHaveAttribute("aria-expanded", "false");
  await expect(instructions).toBeHidden();
});

test("iPad desktop-mode Safari receives add-to-home-screen guidance", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    Object.defineProperties(navigator, {
      maxTouchPoints: { configurable: true, value: 5 },
      userAgent: {
        configurable: true,
        value:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      },
    });
  });
  await page.goto("./");

  const control = page.getByRole("group", { name: "Приложение и офлайн-доступ" });
  await control
    .getByRole("button", { name: "Установить", exact: true })
    .click();
  await expect(control).toContainText(
    "Safari: «Поделиться» → «На экран Домой».",
  );
});

test("Chrome on iPhone receives add-to-home-screen guidance", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/128.0.0.0 Mobile/15E148 Safari/604.1",
    });
    const addEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options,
    ) {
      if (this === window && type === "beforeinstallprompt") return;
      return addEventListener.call(this, type, listener, options);
    };
  });
  await page.goto("./");

  const control = page.getByRole("group", { name: "Приложение и офлайн-доступ" });
  await control
    .getByRole("button", { name: "Установить", exact: true })
    .click();
  await expect(control).toContainText(
    "«Поделиться» → «На экран Домой».",
  );
  await expect(control).not.toContainText("Установить приложение");
});

test("standalone launch hides installation actions", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });
  });
  await page.goto("./");

  const control = page.getByRole("group", {
    name: "Приложение и офлайн-доступ",
    includeHidden: true,
  });
  await expectActiveRelease(page);
  await expect(control).toBeHidden();
});

test("a browser without an agreed installation surface gets no install action", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0",
    });
    const addEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options,
    ) {
      if (this === window && type === "beforeinstallprompt") return;
      return addEventListener.call(this, type, listener, options);
    };
  });
  await page.goto("./");

  const control = page.getByRole("group", {
    name: "Приложение и офлайн-доступ",
    includeHidden: true,
  });
  await expectActiveRelease(page);
  await expect(control).toBeHidden();
});

test("an unsupported browser keeps the ordinary site quiet", async ({
  context,
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
  });

  await page.goto("./");

  await expect(
    page.getByRole("heading", {
      name: "Выбери Курс и начни с первого Урока.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Приложение и офлайн-доступ" }),
  ).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test("External References are marked, blocked offline, and restored online", async ({
  baseURL,
  context,
  page,
  request,
}) => {
  const release = await getReleaseInventory(baseURL, request);
  const platformScope =
    siteBasePath === "/" ? "/" : `${siteBasePath}/`;
  let referenceCount = 0;
  for (const route of release.routes) {
    await page.goto(route);
    const references = page.locator("main a[href]");
    const count = await references.count();
    for (let index = 0; index < count; index += 1) {
      const reference = references.nth(index);
      const href = await reference.getAttribute("href");
      const url = new URL(href!, siteOrigin);
      const isInternalPlatformLink =
        url.origin === siteOrigin &&
        (url.pathname === siteBasePath ||
          url.pathname.startsWith(platformScope));
      if (
        !["http:", "https:"].includes(url.protocol) ||
        isInternalPlatformLink
      ) {
        continue;
      }
      referenceCount += 1;
      await expect(reference).toHaveAttribute("data-external-reference", "");
      await expect(reference).toHaveAttribute("target", "_blank");
      await expect(reference).toHaveAttribute("rel", /noopener/);
      await expect(reference).toHaveAttribute("rel", /noreferrer/);
      await expect(
        reference.locator("sup.external-reference-marker"),
      ).toHaveText("↗");
      await expect(reference).not.toContainText("требуется интернет");
    }
  }
  expect(referenceCount).toBeGreaterThan(1);

  await page.goto("./courses/lesson-history/lessons/moved-lesson/");
  const internalReference = page.getByRole("link", {
    name: "Внутренняя ссылка на Урок",
    exact: true,
  });
  await expect(internalReference).not.toHaveAttribute(
    "data-external-reference",
    "",
  );
  await expect(internalReference).not.toHaveAttribute("target", "_blank");
  await expect(internalReference).not.toHaveAttribute("rel", /noopener/);
  await expect(
    internalReference.locator("sup.external-reference-marker"),
  ).toHaveCount(0);

  const sameOriginExternalReference = page.getByRole("link", {
    name: "Внешняя ссылка с общего домена",
    exact: true,
  });
  await expect(sameOriginExternalReference).toHaveAttribute(
    "data-external-reference",
    "",
  );
  await expect(sameOriginExternalReference).toHaveAttribute(
    "target",
    "_blank",
  );

  await context.route("https://www.w3.org/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Astro documentation</title>",
    }),
  );
  await page.goto("./courses/markdown/lessons/links-code/");

  const reference = page.getByRole("link", {
    name: /разбор критерия 2\.4\.4/,
  });
  await expect(reference).toHaveAttribute("target", "_blank");
  await expect(reference).toHaveAttribute("rel", /noopener/);
  await expect(reference).toHaveAttribute("rel", /noreferrer/);
  await expect(reference).toHaveAttribute("data-external-reference", "");

  const onlinePagePromise = context.waitForEvent("page");
  await reference.click();
  const onlinePage = await onlinePagePromise;
  await onlinePage.waitForLoadState();
  expect(onlinePage.url()).toMatch(/^https:\/\/www\.w3\.org\//);
  await onlinePage.close();

  const lessonUrl = page.url();
  const selectedAnswer = page.getByRole("checkbox", {
    name: "Текст в квадратных скобках",
  });
  await selectedAnswer.check();
  await context.setOffline(true);
  await reference.click();
  expect(page.url()).toBe(lessonUrl);
  await expect(reference).toBeFocused();
  await expect(selectedAnswer).toBeChecked();
  const offlineMessage = page.getByRole("status").filter({
    hasText: "Для этой ссылки нужен интернет.",
  });
  await expect(offlineMessage).toBeVisible();
  const offlineMessageId = await offlineMessage.getAttribute("id");
  expect(offlineMessageId).toBeTruthy();
  expect(
    (await reference.getAttribute("aria-describedby"))?.split(/\s+/),
  ).toContain(offlineMessageId);
  expect(context.pages()).toHaveLength(1);

  await context.setOffline(false);
  await expect(offlineMessage).toBeHidden();
  await expect(reference).not.toHaveAttribute("aria-describedby", /.+/);
  const restoredPagePromise = context.waitForEvent("page");
  await reference.click();
  const restoredPage = await restoredPagePromise;
  await restoredPage.close();
});
