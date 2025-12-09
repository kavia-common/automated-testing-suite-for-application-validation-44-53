# Tests Directory

- tests/login.spec.ts: Playwright E2E login tests implemented in JavaScript (file extension .ts by request), parameterized by Excel.
- tests/utils/excel.js: Excel parser that reads scenarios and falls back to environment variables.

How to install and run:
- npm ci
- npx playwright install --with-deps
- npx playwright test

Alternatively:
- npm run test:e2e

Environment variables:
- REACT_APP_TEST_BASE_URL (default: http://localhost:3000)
- REACT_APP_TEST_USERNAME
- REACT_APP_TEST_PASSWORD
- REACT_APP_TEST_DASHBOARD_SELECTOR (optional post-login selector)
- REACT_APP_TEST_DASHBOARD_URL_CONTAINS (default: /dashboard)
- EXPECT_SUCCESS_SELECTOR (alternative env for success selector)

Spreadsheet:
- Place the Excel at repository root attachments folder:
  - attachments/20251209_105227_Login_Test_Cases.xlsx (preferred)
  - attachments/20251209_103508_Login_Test_Cases.xlsx (supported)
- The parser infers success/failure from the "Expected Result (Single Output)" text and will heuristically extract credentials from the steps when present. Missing values fall back to env vars above.

Iframe flow used by tests:
1) await page.locator('[data-testid="iframe"]').contentFrame().getByTestId('lsq-form-field-input-test').click();
2) fill email and click Continue
3) click the same input, fill password, click Continue

Success assertions:
- Prefer EXPECT_SUCCESS_SELECTOR or REACT_APP_TEST_DASHBOARD_SELECTOR; else REACT_APP_TEST_DASHBOARD_URL_CONTAINS; else URL not matching /login.

Failure assertions:
- If expectErrorText exists in scenario, assert it; otherwise look for generic alert or typical error text.
