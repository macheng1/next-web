import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests/browser',testMatch:'**/*.spec.ts',use:{channel:'chrome',baseURL:'http://127.0.0.1:4175'},webServer:{command:'npx vite --config tests/browser/vite.config.ts --host 127.0.0.1 --port 4175 --strictPort',url:'http://127.0.0.1:4175',reuseExistingServer:!process.env.CI},workers:1});
