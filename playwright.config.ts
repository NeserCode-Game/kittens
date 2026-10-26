import { defineConfig } from "@playwright/test";

const appUrl = process.env.KITTENS_SMOKE_URL ?? "http://localhost:8888";

export default defineConfig({
  testDir: "./tests",
  outputDir: ".agent/playwright",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  reporter: [["line"]],
  use: {
    baseURL: appUrl,
    browserName: "chromium",
    channel: process.env.CHROME_CHANNEL ?? "chrome",
    headless: true,
    locale: "zh-CN",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: process.env.KITTENS_SMOKE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:8888",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
