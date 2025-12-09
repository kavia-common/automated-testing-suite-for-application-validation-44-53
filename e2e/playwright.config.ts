import { defineConfig, devices } from '@playwright/test';

// baseURL resolution notes:
// - Prefer TEST_BASE_URL (explicit for tests).
// - Fallback to REACT_APP_FRONTEND_URL, then REACT_APP_BACKEND_URL, then REACT_APP_API_BASE.
// - If none set, baseURL will be undefined and tests should navigate with absolute URLs.
const envBaseUrl =
  (process.env.TEST_BASE_URL?.trim() ||
    process.env.REACT_APP_FRONTEND_URL?.trim() ||
    process.env.REACT_APP_BACKEND_URL?.trim() ||
    process.env.REACT_APP_API_BASE?.trim() ||
    '');

export default defineConfig({
  testDir: './',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    headless: true,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    baseURL: envBaseUrl || undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* CI note: ensure browsers are installed via `npx playwright install --with-deps` */
});
