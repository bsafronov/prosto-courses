import { expect, test } from "@playwright/test";

test("production assets load under the repository base path", async ({
  page,
}) => {
  await page.goto("./courses/markdown/lessons/vvedenie/");

  const assetUrls = await page.locator("script[src], img[src]").evaluateAll(
    (elements) =>
      elements.map((element) =>
        new URL(element.getAttribute("src")!, document.baseURI).href,
      ),
  );

  expect(assetUrls).not.toHaveLength(0);
  for (const assetUrl of assetUrls) {
    const response = await page.request.get(assetUrl);
    expect(response.ok()).toBe(true);
  }
});
