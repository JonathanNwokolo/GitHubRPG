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
  webServer: [
    {
      // In-memory stand-in for Upstash Redis: the unique-profile counter is exercised without any real service.
      command: "node e2e/support/fakeUpstash.mjs",
      url: "http://127.0.0.1:3917/__state",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: "npx next start -p 3005",
      url: "http://localhost:3005",
      reuseExistingServer: false,
      // Production builds require an explicit data source; e2e always runs on the mock.
      env: {
        GITHUB_DATA_SOURCE: "mock",
        GAME_ENGINE_V2_UI_ENABLED: "true",
        GAME_ENGINE_V2_UI_ALLOWLIST: "veteran-dev,polyglot-dev,popular-dev,empty-dev,cold-dev",
        GAME_ENGINE_V2_E2E_COLD_USERNAME: "cold-dev",
        // Counter against the fake store (the seam is inert on Vercel and on the GitHub source).
        USAGE_COUNTER_E2E: "1",
        UPSTASH_REDIS_REST_URL: "http://127.0.0.1:3917",
        UPSTASH_REDIS_REST_TOKEN: "e2e-test-credential",
      },
      timeout: 60000,
    },
  ],
});
