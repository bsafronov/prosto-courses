import { expect, test } from "@playwright/test";

const courseTreePaths = [
  "./courses/markdown/",
  "./courses/markdown/modules/osnovy/",
  "./courses/markdown/lessons/vvedenie/",
  "./courses/markdown/modules/osnovy/checkpoint/",
  "./courses/markdown/capstone/",
];

test("every Course tree route and its assets load under the repository base path", async ({
  page,
}) => {
  for (const route of courseTreePaths) {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);

    const assetUrls = await page.locator("script[src], img[src]").evaluateAll(
      (elements) =>
        elements.map((element) =>
          new URL(element.getAttribute("src")!, document.baseURI).href,
        ),
    );

    expect(assetUrls).not.toHaveLength(0);
    for (const assetUrl of assetUrls) {
      const assetResponse = await page.request.get(assetUrl);
      expect(assetResponse.ok()).toBe(true);
    }
  }
});

test("owned authoring artifacts never become learner-facing routes", async ({
  page,
}, testInfo) => {
  const baseUrl = testInfo.project.use.baseURL!;
  const artifactPaths = [
    "courses/markdown/_authoring/brief.md",
    "courses/markdown/_authoring/blueprint.md",
    "courses/markdown/_authoring/quality-report.md",
    "courses/markdown/_authoring/brief/",
    "courses/markdown/_authoring/blueprint/",
    "courses/markdown/_authoring/quality-report/",
  ];

  for (const artifactPath of artifactPaths) {
    const response = await page.request.get(new URL(artifactPath, baseUrl).href);
    expect(response.status()).toBe(404);
  }
});
