import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E test configuration for Agent-Native IM Web.
 *
 * Before running tests:
 *   1. Install browser: npx playwright install chromium
 *   2. Start dev server: npm run dev
 *   3. Run tests: npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  /* Shared settings for all projects */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 60_000,
  },

  timeout: 30_000,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
