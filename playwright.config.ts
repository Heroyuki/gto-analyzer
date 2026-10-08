import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/acceptance', fullyParallel: true, retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: { command: 'npm run preview --workspace @gto-analyzer/web -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
