import { defineConfig } from "@playwright/test";

process.env.NO_PROXY = [process.env.NO_PROXY, "127.0.0.1", "localhost"]
  .filter(Boolean)
  .join(",");

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:4321/prosto-courses",
    channel: "chrome",
  },
  webServer: {
    command: "pnpm build && pnpm preview --host 127.0.0.1",
    url: "http://127.0.0.1:4321/prosto-courses/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NO_PROXY: process.env.NO_PROXY },
  },
});
