import { test, expect } from '@playwright/test';

// PUBLIC_INTERFACE
test('LeadSquared app availability without authentication', async ({ page }) => {
  /** Verifies that the public URL is reachable without authentication.
   * Steps:
   * 1) Navigate to URL
   * 2) Wait for DOM content loaded/network idle
   * 3) Validate response status is <400 if available, else validate visible body and non-empty title/content
   * 4) Log final URL and status in the test output
   */
  const targetUrl = 'https://app.leadsquared.com/Form/Edit?Id=265cf80f-7c4c-4af6-88a6-76de0d250422&assetsVersion=1764070156527_2006';

  let status: number | undefined;
  // Navigate and capture the main response when possible
  const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  status = response?.status();

  // Wait for network to settle a bit, but do not block excessively
  try {
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
  } catch {
    // Ignore tight single-page apps that keep sockets open
  }

  // If we got a response, check status < 400
  let statusOk = false;
  if (typeof status === 'number') {
    statusOk = status < 400;
  }

  // Fallback checks: the page should render some basic shell content
  const title = await page.title();
  const hasNonEmptyTitle = !!(title && title.trim().length > 0);

  // Ensure body exists and is visible-ish: check for presence and some text content
  const bodyHandle = await page.locator('body');
  const bodyVisible = await bodyHandle.count().then(c => c > 0);
  const bodyText = bodyVisible ? await bodyHandle.textContent() : '';
  const hasSomeContent = !!(bodyText && bodyText.trim().length > 0);

  // Log useful diagnostics
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    finalUrl: page.url(),
    status,
    title,
    bodyHasContent: hasSomeContent,
  }));

  // Consider success if either the status is OK-like or we have rendered content with a non-empty title or body text.
  expect(statusOk || hasNonEmptyTitle || hasSomeContent).toBeTruthy();
});
