# Playwright E2E Tests - Login

This folder contains Playwright E2E tests for the login flow using an iframe. The tests are parameterized from an Excel spreadsheet.

## Quick start

1. Install dependencies (from this container directory):
   - npm ci

2. Environment variables (optional but recommended):
   - REACT_APP_TEST_BASE_URL (default: http://localhost:3000)
   - REACT_APP_TEST_USERNAME (used as default in case spreadsheet omits username)
   - REACT_APP_TEST_PASSWORD (used as default in case spreadsheet omits password)
   - REACT_APP_TEST_DASHBOARD_SELECTOR (CSS selector expected on success, optional)
   - REACT_APP_TEST_DASHBOARD_URL_CONTAINS (substring expected in URL on success, default: /dashboard)

3. Excel file location
   - Place the spreadsheet at: `attachments/20251209_103508_Login_Test_Cases.xlsx` at the repo root.
   - The loader will try common header names:
     - Title / Test Title / Name
     - Username / User / Email / Login
     - Password / Pass
     - Outcome / Result / Expected (expects "success" or "failure")
     - Expected Message / Error / Error Message
     - Expected URL Contains / URL
     - Expected Selector / Selector

4. Run tests
   - npx playwright test

## Locators

The tests implement the exact sequence provided:

- await page.locator('[data-testid="iframe"]').contentFrame().getByTestId('lsq-form-field-input-test').click();
- await page.locator('[data-testid="iframe"]').contentFrame().getByTestId('lsq-form-field-input-test').fill('<username>');
- await page.locator('[data-testid="iframe"]').contentFrame().getByRole('button', { name: 'Continue' }).click();
- await page.locator('[data-testid="iframe"]').contentFrame().getByTestId('lsq-form-field-input-test').click();
- await page.locator('[data-testid="iframe"]').contentFrame().getByTestId('lsq-form-field-input-test').fill('<password>');
- await page.locator('[data-testid="iframe"]').contentFrame().getByRole('button', { name: 'Continue' }).click();

## Notes

- If the spreadsheet cannot be found, a small fallback dataset is used so the suite still runs.
- On success, the test asserts via selector presence or URL contains. Configure via env or the spreadsheet.
- On failure, the test asserts an error message or alert presence, using either the expected message from the spreadsheet or generic patterns.
