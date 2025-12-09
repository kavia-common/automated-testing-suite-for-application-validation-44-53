import { test, expect } from '@playwright/test';
import { getBaseURL, loadLoginTestCases, getSuccessAssertionHints } from './utils/testData';

/**
 * How to run:
 * - Ensure dependencies are installed (in the root of this container):
 *     npm ci
 * - Optional environment variables:
 *     REACT_APP_TEST_BASE_URL=http://localhost:3000
 *     REACT_APP_TEST_USERNAME=<valid username>
 *     REACT_APP_TEST_PASSWORD=<valid password>
 *     REACT_APP_TEST_DASHBOARD_SELECTOR=<CSS selector present on success>
 *     REACT_APP_TEST_DASHBOARD_URL_CONTAINS=/dashboard
 * - Place the Excel file (if not already) at: repo_root/attachments/20251209_103508_Login_Test_Cases.xlsx
 * - Run tests:
 *     npx playwright test
 *
 * These tests will:
 *  - Navigate to baseURL
 *  - Interact with login within an iframe using the provided locators sequence
 *  - Parameterize scenarios from the Excel sheet or fallback sample
 *  - Assert success (dashboard) or failure (error message) per test case
 */

const BASE_URL = getBaseURL();
const SUCCESS_HINTS = getSuccessAssertionHints();

const cases = loadLoginTestCases();

test.describe('Authentication - Login via iframe flow', () => {
  for (const c of cases) {
    test(c.title, async ({ page }) => {
      // Navigate to base URL
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      // Wait for iframe present and get content frame
      const iframeLocator = page.locator('[data-testid="iframe"]');
      await expect(iframeLocator).toBeVisible({ timeout: 15000 });

      const frame = await iframeLocator.contentFrame();
      expect(frame, 'Login iframe contentFrame should be available').not.toBeNull();

      // Provided locators sequence - USERNAME
      await frame!.getByTestId('lsq-form-field-input-test').click();
      await frame!.getByTestId('lsq-form-field-input-test').fill(c.username ?? '');
      await frame!.getByRole('button', { name: 'Continue' }).click();

      // Provided locators sequence - PASSWORD
      await frame!.getByTestId('lsq-form-field-input-test').click();
      await frame!.getByTestId('lsq-form-field-input-test').fill(c.password ?? '');
      await frame!.getByRole('button', { name: 'Continue' }).click();

      // Outcome assertions
      if (c.outcome === 'success') {
        // Prefer row-specific expected selector/url, else use env hints
        const expectedSelector = c.expectedSelector || SUCCESS_HINTS.selector;
        const expectedUrlContains = c.expectedUrlContains || SUCCESS_HINTS.urlContains;

        // If a selector is configured, wait for it to appear
        if (expectedSelector) {
          await expect(page.locator(expectedSelector)).toBeVisible({ timeout: 20000 });
        } else {
          // Otherwise, assert for a common dashboard pattern if provided via URL contains
          if (expectedUrlContains && expectedUrlContains.trim().length > 0) {
            await expect(page).toHaveURL(new RegExp(`${escapeRegex(expectedUrlContains)}`), { timeout: 20000 });
          } else {
            // Fallback: check at least we are no longer on a login route if it's part of the app
            await expect(page).not.toHaveURL(/login/i, { timeout: 20000 });
          }
        }

        // Optionally validate network status of dashboard or me endpoint if available
        // We keep it resilient and optional; attempt to wait for any 200 after click as a heuristic.
        const response = await page.waitForResponse(
          (resp) => resp.ok() && isSameOrigin(resp.url(), BASE_URL),
          { timeout: 10000 }
        ).catch(() => null);
        expect.soft(response, 'Expected at least one successful network response after authentication').not.toBeNull();
      } else {
        // Failure path: Expect an error toast/text either in frame or page
        // Priority: Row expected message -> common selectors/text patterns
        if (c.expectedMessage && c.expectedMessage.trim().length > 0) {
          // Check in-frame first
          const errorCandidateInFrame = frame!.getByText(c.expectedMessage, { exact: false });
          // Use race-like approach: ensure at least one place shows it
          const found = await waitForAnyVisible(
            [
              () => errorCandidateInFrame,
              () => page.getByText(c.expectedMessage!, { exact: false }),
              () => frame!.locator('[role="alert"]'),
              () => page.locator('[role="alert"]'),
            ],
            15000
          );
          expect(found, `Expected error message or alert to appear: "${c.expectedMessage}"`).toBeTruthy();
        } else {
          // Generic failure UI patterns when message unknown
          const genericCandidates = [
            () => frame!.locator('[role="alert"]'),
            () => page.locator('[role="alert"]'),
            () => frame!.getByText(/invalid|incorrect|failed|try again/i),
            () => page.getByText(/invalid|incorrect|failed|try again/i),
          ];
          const found = await waitForAnyVisible(genericCandidates, 15000);
          expect(found, 'Expected an error message or alert on login failure').toBeTruthy();
        }
      }
    });
  }
});

/**
 * Utility to wait for any one of the provided locator suppliers to become visible.
 */
async function waitForAnyVisible(
  locatorSuppliers: Array<() => import('@playwright/test').Locator>,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    for (const supplier of locatorSuppliers) {
      try {
        const loc = supplier();
        const visible = await loc.isVisible();
        if (visible) return true;
      } catch {
        // ignore and continue
      }
    }
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, 200));
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSameOrigin(url: string, base: string): boolean {
  try {
    const u = new URL(url);
    const b = new URL(base);
    return u.origin === b.origin;
  } catch {
    return false;
  }
}
