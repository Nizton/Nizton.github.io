import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "msedge",
  },
  webServer: {
    command: "node scripts/preview.ts --production",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
