# Playwright Availability Test

This repository includes a minimal Playwright test to verify that the target application URL is accessible without authentication.

## Directory Structure

- e2e/
  - playwright.config.ts
  - accessibility.spec.ts

## Prerequisites

- Node.js 18+ recommended
- npm

## Install Dependencies

From the workspace root (`automated-testing-suite-for-application-validation-44-53`):

```bash
npm install
```

Install Playwright browsers (includes dependencies for CI):

```bash
npx playwright install --with-deps
```

## Run Tests

```bash
npm run test:e2e
```

This will execute the tests in headless mode and produce a list and HTML report:
- HTML report path: `e2e/playwright-report/`

To open the HTML report after a run:

```bash
npx playwright show-report e2e/playwright-report
```
