import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

export type LoginTestCase = {
  title: string;
  username: string;
  password: string;
  outcome: 'success' | 'failure';
  expectedMessage?: string;
  expectedUrlContains?: string;
  expectedSelector?: string;
};

function envOrDefault(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  if (v && v.trim().length > 0) return v.trim();
  return fallback;
}

/**
 * Resolve spreadsheet absolute path from repo root
 */
function resolveSpreadsheetPath(): string {
  // Spreadsheet provided under attachments at repo root in this workspace
  const candidates = [
    path.resolve(process.cwd(), '../../attachments/20251209_103508_Login_Test_Cases.xlsx'), // running from playwright_test_suite_frontend
    path.resolve(process.cwd(), '../attachments/20251209_103508_Login_Test_Cases.xlsx'), // running from workspace root
    path.resolve(process.cwd(), 'attachments/20251209_103508_Login_Test_Cases.xlsx'), // edge
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

/**
 * PUBLIC_INTERFACE
 * Returns login test cases parsed from the Excel sheet or fallback sample data if the sheet is not found.
 */
export function loadLoginTestCases(): LoginTestCase[] {
  const baseURL = envOrDefault('REACT_APP_TEST_BASE_URL', 'http://localhost:3000');
  const defaultUser = envOrDefault('REACT_APP_TEST_USERNAME', '');
  const defaultPass = envOrDefault('REACT_APP_TEST_PASSWORD', '');

  const excelPath = resolveSpreadsheetPath();

  if (excelPath && fs.existsSync(excelPath)) {
    try {
      const wb = xlsx.readFile(excelPath);
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

      const out: LoginTestCase[] = [];

      for (const r of rows) {
        // Try to map commonly expected column names with flexible keys
        const title = String(r['Title'] || r['Test Title'] || r['Name'] || '').trim();
        const username = String(r['Username'] || r['User'] || r['Email'] || r['Login'] || defaultUser || '').trim();
        const password = String(r['Password'] || r['Pass'] || defaultPass || '').trim();
        const outcomeRaw = String(r['Outcome'] || r['Result'] || r['Expected'] || '').toLowerCase().trim();
        const expectedMessage = String(r['Expected Message'] || r['Error'] || r['Error Message'] || '').trim();
        const expectedUrlContains = String(r['Expected URL Contains'] || r['URL'] || '').trim();
        const expectedSelector = String(r['Expected Selector'] || r['Selector'] || '').trim();

        const outcome: LoginTestCase['outcome'] =
          outcomeRaw === 'success' ? 'success' : 'failure';

        // Build title if empty
        const finalTitle =
          title ||
          `Login ${outcome === 'success' ? 'succeeds' : 'fails'} for user "${username || '<empty>'}"`;

        out.push({
          title: finalTitle,
          username,
          password,
          outcome,
          expectedMessage: expectedMessage || undefined,
          expectedUrlContains: expectedUrlContains || undefined,
          expectedSelector: expectedSelector || undefined,
        });
      }

      // If file parsed but no rows, fallback to sample
      if (out.length > 0) {
        return out;
      }
    } catch (err) {
      // fall through to sample
      // eslint-disable-next-line no-console
      console.warn('Failed to parse Excel, using fallback sample data:', err);
    }
  }

  // Fallback sample data so tests still run
  const fallbackUser = defaultUser || 'demo@example.com';
  const fallbackPass = defaultPass || 'Password123!';
  return [
    {
      title: 'Login succeeds with valid credentials (env/default)',
      username: fallbackUser,
      password: fallbackPass,
      outcome: 'success',
      // Allow success assertion via selector/url config in test
    },
    {
      title: 'Login fails with invalid password',
      username: fallbackUser,
      password: 'invalid-password',
      outcome: 'failure',
      expectedMessage: 'Invalid username or password',
    },
  ];
}

/**
 * PUBLIC_INTERFACE
 * Resolves the base URL for tests.
 */
export function getBaseURL(): string {
  return envOrDefault('REACT_APP_TEST_BASE_URL', 'http://localhost:3000')!;
}

/**
 * PUBLIC_INTERFACE
 * Returns default success assertion hints from environment variables if provided.
 * These can be overridden per-row using the spreadsheet fields Expected URL Contains or Expected Selector.
 */
export function getSuccessAssertionHints(): { selector?: string; urlContains?: string } {
  // Optional additional env hints
  const selector = envOrDefault('REACT_APP_TEST_DASHBOARD_SELECTOR');
  const urlContains = envOrDefault('REACT_APP_TEST_DASHBOARD_URL_CONTAINS', '/dashboard');
  return { selector: selector || undefined, urlContains: urlContains || undefined };
}
