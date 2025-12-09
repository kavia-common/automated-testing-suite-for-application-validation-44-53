'use strict';

// Note: Although file extension is .ts, this is implemented in plain JavaScript as requested.
const { test, expect } = require('@playwright/test');
const { loadScenariosFromExcel } = require('./utils/excel');

// Env-based defaults and optional success hints
const DEFAULT_BASE_URL = process.env.REACT_APP_TEST_BASE_URL || 'http://localhost:3000';
const EXPECT_SUCCESS_SELECTOR = process.env.EXPECT_SUCCESS_SELECTOR || process.env.REACT_APP_TEST_DASHBOARD_SELECTOR || '';
const EXPECT_SUCCESS_URL_CONTAINS = process.env.REACT_APP_TEST_DASHBOARD_URL_CONTAINS || '/dashboard';

// Load scenarios from Excel (attachments/20251209_105227_Login_Test_Cases.xlsx) with env fallbacks
const scenarios = loadScenariosFromExcel();

test.describe('Authentication - Login via iframe flow', () => {
  for (const sc of scenarios) {
    test(sc.title, async ({ page }) => {
      const baseUrl = (sc.baseUrl && String(sc.baseUrl).trim()) || DEFAULT_BASE_URL;

      // Navigate to base URL
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      // Wait for iframe and obtain frame
      const iframeLocator = page.locator('[data-testid="iframe"]');
      await expect(iframeLocator).toBeVisible({ timeout: 30000 });
      const frame = await iframeLocator.contentFrame();
      expect(frame, 'Expected contentFrame from [data-testid="iframe"]').not.toBeNull();

      // Sequence: username
      await frame.getByTestId('lsq-form-field-input-test').click();
      await frame.getByTestId('lsq-form-field-input-test').fill(sc.username || '');
      await frame.getByRole('button', { name: 'Continue' }).click();

      // Sequence: password
      await frame.getByTestId('lsq-form-field-input-test').click();
      await frame.getByTestId('lsq-form-field-input-test').fill(sc.password || '');
      await frame.getByRole('button', { name: 'Continue' }).click();

      if (sc.expectSuccess) {
        // Prefer row hints, then env hints
        const expectedSelector = sc.expectedSelector || EXPECT_SUCCESS_SELECTOR;
        const expectedUrlContains = sc.expectedUrlContains || EXPECT_SUCCESS_URL_CONTAINS;

        // Wait for either selector visibility or URL change
        if (expectedSelector) {
          await expect(page.locator(expectedSelector)).toBeVisible({ timeout: 30000 });
        } else if (expectedUrlContains && expectedUrlContains.trim().length) {
          await expect(page).toHaveURL(new RegExp(`${escapeRegex(expectedUrlContains)}`), { timeout: 30000 });
        } else {
          // Generic fallback: not on login URL
          await expect(page).not.toHaveURL(/login/i, { timeout: 30000 });
        }

        // Soft check: some successful network response from same origin after auth
        const sameOriginOk = await page
          .waitForResponse((resp) => resp.ok() && isSameOrigin(resp.url(), baseUrl), { timeout: 10000 })
          .then(() => true)
          .catch(() => false);
        expect.soft(sameOriginOk, 'Expected at least one successful same-origin response after login').toBeTruthy();
      } else {
        // Failure: assert specific error text if provided else generic error element/patterns
        const expectedError = sc.expectErrorText && String(sc.expectErrorText).trim();

        if (expectedError) {
          const found = await waitForAnyVisible(
            [
              () => frame.getByText(expectedError, { exact: false }),
              () => page.getByText(expectedError, { exact: false }),
              () => frame.locator('[role="alert"]'),
              () => page.locator('[role="alert"]'),
            ],
            20000
          );
          expect(found, `Expected error message or alert visible: "${expectedError}"`).toBeTruthy();
        } else {
          const found = await waitForAnyVisible(
            [
              () => frame.locator('[role="alert"]'),
              () => page.locator('[role="alert"]'),
              () => frame.getByText(/invalid|incorrect|failed|try again/i),
              () => page.getByText(/invalid|incorrect|failed|try again/i),
            ],
            20000
          );
          expect(found, 'Expected an error state to become visible for failed login').toBeTruthy();
        }
      }
    });
  }
});

/**
 * PUBLIC_INTERFACE
 * Wait until any one of the provided locator suppliers is visible.
 */
async function waitForAnyVisible(locatorSuppliers, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    for (const supplier of locatorSuppliers) {
      try {
        const loc = supplier();
        if (await loc.isVisible()) return true;
      } catch {
        // ignore
      }
    }
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, 150));
  }
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSameOrigin(url, base) {
  try {
    const u = new URL(url);
    const b = new URL(base);
    return u.origin === b.origin;
  } catch {
    return false;
  }
}
