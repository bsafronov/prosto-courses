import { defineConfig } from "@playwright/test";
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
  use: {
    baseURL: siteRootUrl,
    channel: "chrome",
  },
  webServer: {
    command: "node tests/support/preview-content-fixtures.mjs",
    url: siteRootUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NO_PROXY: process.env.NO_PROXY },
  },
});
