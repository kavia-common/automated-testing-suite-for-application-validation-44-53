# Tests Directory

- login.spec.ts: E2E login flow tests using Playwright and iframe locators.
- utils/testData.ts: Excel parsing utility with environment variable defaults and fallback dataset.

Run:
- npx playwright test

Env:
- REACT_APP_TEST_BASE_URL (default: http://localhost:3000)
- REACT_APP_TEST_USERNAME
- REACT_APP_TEST_PASSWORD
- REACT_APP_TEST_DASHBOARD_SELECTOR (optional)
- REACT_APP_TEST_DASHBOARD_URL_CONTAINS (default: /dashboard)

Spreadsheet:
- Place at repository root: attachments/20251209_103508_Login_Test_Cases.xlsx
