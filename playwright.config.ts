import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 4,
  reporter: "line",
  use: {
    baseURL: "http://localhost:3005",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx next start -p 3005",
    url: "http://localhost:3005",
    reuseExistingServer: false,
    // Production builds require an explicit data source; e2e always runs on the mock.
    env: { GITHUB_DATA_SOURCE: "mock" },
    timeout: 60000,
  },
});
