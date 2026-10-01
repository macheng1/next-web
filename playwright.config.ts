import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  testMatch: "**/*.spec.ts",
  use: { channel: "chrome", baseURL: "http://127.0.0.1:4175" },
  webServer: [{
    command:
      "npx vite --config tests/browser/vite.config.mts --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: !process.env.CI,
  }, {
    command: "NEXT_DIST_DIR=.next-verify DEPLOYMENT_ENV=test NEXT_PUBLIC_SITE_URL=http://127.0.0.1:4176 npx next start -p 4176",
    url: "http://127.0.0.1:4176/api/health/live",
    reuseExistingServer: false,
  }],
  workers: 1,
});
