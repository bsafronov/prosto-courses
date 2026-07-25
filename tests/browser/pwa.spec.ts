import {
  expect,
  test,
  type APIRequestContext,
} from "@playwright/test";

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
    theme_color: "#3347a8",
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
    theme_color: "#3347a8",
    icons: expect.arrayContaining([
      expect.objectContaining({ src: "/pwa-192x192.png" }),
      expect.objectContaining({ src: "/pwa-512x512.png" }),
      expect.objectContaining({ src: "/maskable-icon-512x512.png" }),
    ]),
  });
});

test("the header reports complete Offline Availability and recovers unknown routes offline", async ({
  baseURL,
  context,
  page,
  request,
}) => {
  const release = await getReleaseInventory(baseURL, request);
  const expectedScope = fixtureServerUrl(baseURL, "./");
  const expectedController = fixtureServerUrl(baseURL, "./sw.js");
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

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  const status = control.locator("[data-pwa-status]");
  await expect(control).toBeVisible();
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveAttribute("aria-atomic", "true");
  await expect
    .poll(
      async () => ({
        status: await status.textContent(),
        workerErrors,
      }),
      { timeout: 20_000 },
    )
    .toEqual({ status: "Доступно офлайн", workerErrors: [] });

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
      controller: expectedController,
      scope: expectedScope,
    });

  await context.setOffline(true);
  await expect(status).toHaveText("Сейчас офлайн");

  for (const route of release.routes) {
    await page.goto(route);
    await expect(page.locator("main")).not.toBeEmpty();
    await expect(
      page
        .getByRole("group", { name: "Офлайн-доступ" })
        .locator("[data-pwa-status]"),
    ).toHaveText("Сейчас офлайн");
  }

  const unavailableReleaseUrls = await page.evaluate(async (releaseUrls) => {
    const results = await Promise.all(
      releaseUrls.map(async (url) => {
        try {
          const response = await fetch(url);
          return response.ok ? undefined : `${url}: ${response.status}`;
        } catch (error) {
          return `${url}: ${String(error)}`;
        }
      }),
    );
    return results.filter(Boolean);
  }, release.releaseUrls);
  expect(unavailableReleaseUrls).toEqual([]);

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

  await page.goto("./courses/removed-from-release/");
  await expect(
    page.getByRole("heading", { name: "Эта страница не сохранена" }),
  ).toBeVisible();
  const catalog = page.getByRole("link", { name: "Перейти в Каталог курсов" });
  await expect(catalog).toHaveAttribute("href", "/prosto-courses/");
  await catalog.click();
  await expect(
    page.getByRole("heading", { name: "Учись новому — урок за уроком." }),
  ).toBeVisible();
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

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  const status = control.locator("[data-pwa-status]");
  await expect(status).toHaveText("Подготовка офлайн");
  const catalogLink = page.getByRole("link", { name: "Все курсы" });
  await catalogLink.focus();
  await expect(catalogLink).toBeFocused();

  const released = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/1"),
  );
  expect(released.ok()).toBe(true);
  await expect(status).toHaveText("Доступно офлайн", {
    timeout: 20_000,
  });
  await expect(catalogLink).toBeFocused();
});

test("data saving defers preparation until the learner accepts the measured release", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    });
  });
  await page.goto("./");

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  await expect(control.locator("[data-pwa-status]")).toHaveText(
    "Офлайн по запросу",
  );
  await expect(control).toContainText(
    /Экономия трафика включена.*Полный Каталог: \d+(?:[,.]\d)? МБ/,
  );
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);

  await control.getByRole("button", { name: "Скачать" }).click();
  await expect(control.locator("[data-pwa-status]")).toHaveText(
    "Доступно офлайн",
    { timeout: 20_000 },
  );
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

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  await expect(control.locator("[data-pwa-status]")).toHaveText(
    "Офлайн не подготовлен",
    { timeout: 20_000 },
  );
  await expect(control).not.toContainText("Доступно офлайн");
  const stateResponse = await request.get(
    fixtureServerUrl(baseURL, "/__test__/state"),
  );
  expect((await stateResponse.json()).failedPrecacheRequestCount).toBeGreaterThan(
    0,
  );

  const healthyRelease = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/1"),
  );
  expect(healthyRelease.ok()).toBe(true);
  await control.getByRole("button", { name: "Повторить" }).click();
  await expect(control.locator("[data-pwa-status]")).toHaveText(
    "Доступно офлайн",
    { timeout: 20_000 },
  );
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

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  await expect(control.locator("[data-pwa-status]")).toHaveText(
    "Доступно офлайн",
    { timeout: 20_000 },
  );
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
  await expect(control.locator("[data-pwa-status]")).toHaveText(
    "Доступно офлайн",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: firstTitle, exact: true }),
  ).toBeVisible();

  const healthyRelease = await request.post(
    fixtureServerUrl(baseURL, "/__test__/release/2"),
  );
  expect(healthyRelease.ok()).toBe(true);
  await context.setOffline(true);
  await context.setOffline(false);

  const update = control.getByRole("button", { name: "Обновить" });
  await expect(update).toBeVisible({ timeout: 20_000 });
  await expect(control.locator("[data-pwa-status]")).toHaveText(
    "Доступно обновление",
  );
  await expect(control).toContainText(
    "После обновления откроется Каталог курсов.",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: firstTitle, exact: true }),
  ).toBeVisible();

  await context.setOffline(true);
  await expect(control.locator("[data-pwa-status]")).toHaveText(
    "Обновление готово офлайн",
  );
  await expect(update).toBeEnabled();
  await update.click();
  await expect(page).toHaveURL(/\/prosto-courses\/$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Учись новому — урок за уроком." }),
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
  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  const install = control.getByRole("button", {
    name: "Установить",
    exact: true,
  });
  await expect(install).toBeVisible();
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
  await expect(install).toBeHidden();
  await expect(
    control.getByRole("button", { name: "Как установить" }),
  ).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    control.getByRole("button", { name: "Как установить" }),
  ).toBeHidden();
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

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
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

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  await control.getByRole("button", { name: "Как установить" }).click();
  await expect(control).toContainText(
    "Открой меню браузера и выбери «Установить приложение».",
  );
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

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  await control.getByRole("button", { name: "Как установить" }).click();
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

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  await control.getByRole("button", { name: "Как установить" }).click();
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

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  await expect(control).toBeVisible();
  await expect(
    control.getByRole("button", { name: "Установить", exact: true }),
  ).toHaveCount(0);
  await expect(
    control.getByRole("button", { name: "Как установить", exact: true }),
  ).toHaveCount(0);
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

  const control = page.getByRole("group", { name: "Офлайн-доступ" });
  await expect(control).toBeVisible();
  await expect(
    control.getByRole("button", { name: "Установить", exact: true }),
  ).toHaveCount(0);
  await expect(
    control.getByRole("button", { name: "Как установить", exact: true }),
  ).toHaveCount(0);
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
    page.getByRole("heading", { name: "Учись новому — урок за уроком." }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Офлайн-доступ" }),
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
  let referenceCount = 0;
  for (const route of release.routes) {
    await page.goto(route);
    const references = page.locator(
      'main a[href^="http://"], main a[href^="https://"]',
    );
    const count = await references.count();
    referenceCount += count;
    for (let index = 0; index < count; index += 1) {
      const reference = references.nth(index);
      await expect(reference).toHaveAttribute("data-external-reference", "");
      await expect(reference).toHaveAttribute("target", "_blank");
      await expect(reference).toHaveAttribute("rel", /noopener/);
      await expect(reference).toContainText("требуется интернет");
    }
  }
  expect(referenceCount).toBeGreaterThan(1);

  await context.route("https://www.w3.org/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Astro documentation</title>",
    }),
  );
  await page.goto("./courses/markdown/lessons/links-code/");

  const reference = page.getByRole("link", {
    name: /разбор критерия 2\.4\.4.*требуется интернет/,
  });
  await expect(reference).toHaveAttribute("target", "_blank");
  await expect(reference).toHaveAttribute("rel", /noopener/);
  await expect(reference).toHaveAttribute("data-external-reference", "");

  const onlinePagePromise = context.waitForEvent("page");
  await reference.click();
  const onlinePage = await onlinePagePromise;
  await onlinePage.waitForLoadState();
  expect(onlinePage.url()).toMatch(/^https:\/\/www\.w3\.org\//);
  await onlinePage.close();

  const lessonUrl = page.url();
  await context.setOffline(true);
  await reference.click();
  expect(page.url()).toBe(lessonUrl);
  await expect(
    page.getByRole("status").filter({
      hasText: "Для этой ссылки нужен интернет.",
    }),
  ).toBeVisible();
  expect(context.pages()).toHaveLength(1);

  await context.setOffline(false);
  await expect(
    page.getByText("Для этой ссылки нужен интернет."),
  ).toBeHidden();
  const restoredPagePromise = context.waitForEvent("page");
  await reference.click();
  const restoredPage = await restoredPagePromise;
  await restoredPage.close();
});
