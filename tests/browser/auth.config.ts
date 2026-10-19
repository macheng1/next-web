import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "auth.spec.ts",
  use: { channel: "chrome", baseURL: "http://127.0.0.1:4185" },
  timeout: 8000,
  expect: { timeout: 2500 },
  webServer: {
    cwd: process.cwd(),
    command:
      "pnpm exec vite --config tests/browser/vite.config.mts --host 127.0.0.1 --port 4185 --strictPort",
    url: "http://127.0.0.1:4185",
    reuseExistingServer: false,
  },
  workers: 1,
});
