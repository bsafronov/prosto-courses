import { defineConfig, devices } from "@playwright/test";
import { siteBasePath } from "./site.config.mjs";

process.env.NO_PROXY = [process.env.NO_PROXY, "127.0.0.1", "localhost"]
  .filter(Boolean)
  .join(",");

const siteRootUrl = `http://127.0.0.1:4322${
  siteBasePath === "/" ? "/" : `${siteBasePath}/`
}`;

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: siteRootUrl,
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    ...(process.env.PLAYWRIGHT_CROSS_BROWSER === "1"
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
        ]
      : []),
  ],
  webServer: {
    command: "node tests/support/preview-content-fixtures.mjs",
    url: siteRootUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NO_PROXY: process.env.NO_PROXY },
  },
});
