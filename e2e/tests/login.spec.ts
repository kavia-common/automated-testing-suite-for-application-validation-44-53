import { test, expect } from '@playwright/test';

/**
 * Login E2E test
 *
 * Environment-driven configuration:
 * - TEST_BASE_URL: Preferred base URL for the app under test
 * - REACT_APP_FRONTEND_URL / REACT_APP_BACKEND_URL / REACT_APP_API_BASE: Fallbacks if TEST_BASE_URL not provided
 * - TEST_USERNAME: Username for login (default: testuser_demo2@lsqdev.in)
 * - TEST_PASSWORD: Password for login (default: Qwerty1@)
 * - TEST_LOGIN_SUCCESS_SELECTOR: Optional CSS selector to assert post-login (e.g., '[data-testid="user-avatar"]')
 *
 * This test also respects Playwright config baseURL if none of the env vars are provided.
 */

// PUBLIC_INTERFACE
test.describe('Authentication', () => {
  test('User can login via iframe flow', async ({ page, baseURL }) => {
    /** This test validates the login flow where the login form is rendered inside an iframe.
     * Steps:
     * 1) Resolve target URL using env or baseURL
     * 2) Navigate to page and wait for iframe to attach
     * 3) Fill username and Continue, assert password field appears
     * 4) Fill password and Continue
     * 5) Assert successful login condition via selector or URL change
     */

    const username = process.env.TEST_USERNAME || 'testuser_demo2@lsqdev.in';
    const password = process.env.TEST_PASSWORD || 'Qwerty1@';

    const envBase =
      process.env.TEST_BASE_URL ||'https://mail.google.com/chat/u/0/#chat/home'
      // process.env.REACT_APP_FRONTEND_URL ||
      // process.env.REACT_APP_BACKEND_URL ||
      // process.env.REACT_APP_API_BASE ||
      '';

    // Prefer TEST_BASE_URL; fallback to Playwright baseURL; finally envBase if it looks like a URL
    const resolvedBaseUrl = (process.env.TEST_BASE_URL || baseURL || envBase || '').trim();
    if (!resolvedBaseUrl) {
      test.info().annotations.push({ type: 'config', description: 'No base URL found; provide TEST_BASE_URL or set baseURL in Playwright config.' });
    }

    const targetUrl = resolvedBaseUrl || '/';
    test.info().annotations.push({ type: 'target', description: `Navigating to: ${targetUrl}` });

    await test.step('Navigate to login page', async () => {
      const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      // If main navigation yields a response, ensure it's not an error
      if (response) {
        const status = response.status();
        expect.soft(status, `Expected initial navigation status < 400, got ${status}`).toBeLessThan(400);
      }
      // Allow SPA to settle
      try {
        await page.waitForLoadState('networkidle', { timeout: 10_000 });
      } catch {
        // Some apps maintain open connections; ignore
      }
    });

    // Wait for iframe to be attached and get its content frame
    const iframeLocator = page.locator('[data-testid="iframe"]');
    await test.step('Wait for login iframe to be ready', async () => {
      await expect(iframeLocator, 'Login iframe should appear').toBeVisible({ timeout: 30_000 });
      await expect(iframeLocator, 'Login iframe should be attached in DOM').toHaveCount(1);
    });

    const frame = await iframeLocator.elementHandle().then(async (el) => {
      const fr = await el?.contentFrame();
      return fr ?? null;
    });

    expect(frame, 'Expected to resolve iframe contentFrame').not.toBeNull();
    if (!frame) return; // guard for TS

    // Username step
    await test.step('Enter username and continue', async () => {
      const usernameInput = frame.getByTestId('lsq-form-field-input-test');
      await usernameInput.waitFor({ state: 'visible', timeout: 20_000 });
      await usernameInput.click({ timeout: 10_000 });
      await usernameInput.fill(username, { timeout: 10_000 });

      const continueBtn = frame.getByRole('button', { name: 'Continue' });
      await continueBtn.waitFor({ state: 'visible', timeout: 20_000 });
      await continueBtn.click({ timeout: 10_000 });

      // After first continue, we expect the password field to be visible or enabled
      const pwField = frame.getByTestId('lsq-form-field-input-test');
      await expect(pwField, 'Password field should be visible/enabled after username step').toBeVisible({ timeout: 20_000 });
    });

    // Password step
    await test.step('Enter password and continue', async () => {
      const passwordInput = frame.getByTestId('lsq-form-field-input-test');
      await passwordInput.click({ timeout: 10_000 });
      await passwordInput.fill(password, { timeout: 10_000 });

      const continueBtn2 = frame.getByRole('button', { name: 'Continue' });
      await continueBtn2.waitFor({ state: 'visible', timeout: 20_000 });
      await continueBtn2.click({ timeout: 10_000 });
    });

    // Post-login assertion
    await test.step('Verify login success', async () => {
      const successSelector = (process.env.TEST_LOGIN_SUCCESS_SELECTOR || '').trim();

      if (successSelector) {
        // If a selector is provided, prefer it
        const successEl = page.locator(successSelector);
        await expect(successEl, `Waiting for post-login selector "${successSelector}"`).toBeVisible({ timeout: 30_000 });
      } else {
        // Fallback: wait for URL to change away from login route segments and ensure some content
        await page.waitForTimeout(1500); // brief delay for route transition
        const currentUrl = page.url();
        expect(currentUrl.toLowerCase().includes('login')).toBeFalsy();

        // Soft-assert that body has some content
        const bodyText = await page.locator('body').textContent();
        expect.soft(!!(bodyText && bodyText.trim().length > 0), 'Page should render content after login').toBeTruthy();
      }
    });
  });
});
