'use strict';

/**
 * PUBLIC_INTERFACE
 * loadScenariosFromExcel reads the attached Excel file and returns an array of scenarios:
 * [{ title, baseUrl, username, password, expectSuccess, expectErrorText, expectedSelector, expectedUrlContains }]
 * It falls back to environment variables when columns are missing:
 * - baseUrl: process.env.REACT_APP_TEST_BASE_URL
 * - username: process.env.REACT_APP_TEST_USERNAME
 * - password: process.env.REACT_APP_TEST_PASSWORD
 */
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function envOrDefault(name, fallback) {
  const v = process.env[name];
  return v && String(v).trim().length ? String(v).trim() : fallback;
}

function resolveSpreadsheetPaths() {
  // Prefer the provided latest file, but also try the earlier referenced one
  const candidates = [
    path.resolve(process.cwd(), '../../attachments/20251209_105227_Login_Test_Cases.xlsx'),
    path.resolve(process.cwd(), '../../attachments/20251209_103508_Login_Test_Cases.xlsx'),
    path.resolve(process.cwd(), '../attachments/20251209_105227_Login_Test_Cases.xlsx'),
    path.resolve(process.cwd(), '../attachments/20251209_103508_Login_Test_Cases.xlsx'),
    path.resolve(process.cwd(), 'attachments/20251209_105227_Login_Test_Cases.xlsx'),
    path.resolve(process.cwd(), 'attachments/20251209_103508_Login_Test_Cases.xlsx'),
  ];
  return candidates;
}

function pickFirstExisting(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

// PUBLIC_INTERFACE
function loadScenariosFromExcel() {
  const defaults = {
    baseUrl: envOrDefault('REACT_APP_TEST_BASE_URL', 'http://localhost:3000'),
    username: envOrDefault('REACT_APP_TEST_USERNAME', ''),
    password: envOrDefault('REACT_APP_TEST_PASSWORD', ''),
  };

  const excelPath = pickFirstExisting(resolveSpreadsheetPaths());
  if (!excelPath) {
    return buildFallback(defaults);
  }

  try {
    const wb = xlsx.readFile(excelPath);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });

    const scenarios = [];
    for (const r of rows) {
      // Try to map reasonable columns if present. The provided sheet has:
      // - "Test Steps (Combined)"
      // - "Expected Result (Single Output)"
      // We'll infer outcome from Expected Result text and extract credentials heuristically from steps.
      const steps = String(r['Test Steps (Combined)'] || r['Steps'] || r['Test Steps'] || '').trim();
      const expected = String(r['Expected Result (Single Output)'] || r['Expected'] || r['Outcome'] || '').trim();
      const titleBase = String(r['Title'] || r['Test Title'] || '').trim();

      // Heuristic extraction for username/password from steps if embedded like examples show.
      const usernameMatch = steps.match(/username:\s*([^\s,]+)|username\s*:\s*([^\s,]+)/i) ||
                            steps.match(/valid username:\s*([^\s,]+)|valid username\s*:\s*([^\s,]+)/i) ||
                            steps.match(/enter an invalid username.*?\((?:e\.g\.,\s*)?([^\s\)]+)/i);
      const passwordMatch = steps.match(/password:\s*([^\s,]+)|password\s*:\s*([^\s,]+)/i) ||
                            steps.match(/valid password:\s*([^\s,]+)|valid password\s*:\s*([^\s,]+)/i);

      const username = (usernameMatch && (usernameMatch[1] || usernameMatch[2])) || defaults.username || '';
      const password = (passwordMatch && (passwordMatch[1] || passwordMatch[2])) || defaults.password || '';

      const expectedLower = expected.toLowerCase();
      const expectSuccess = /successfully|should authenticate successfully|should successfully log in/.test(expectedLower) && !/prevent login|should prevent login/.test(expectedLower);

      // If failure expected, try to capture an error text if present
      let expectErrorText = '';
      const errMatch = expected.match(/“([^”]+)”|\"([^\"]+)\"/);
      if (errMatch) {
        expectErrorText = errMatch[1] || errMatch[2] || '';
      } else if (/invalid username or password/i.test(expected)) {
        expectErrorText = 'Invalid username or password';
      }

      // Allow optional per-row hints
      const expectedSelector = String(r['Expected Selector'] || r['Selector'] || '').trim() || undefined;
      const expectedUrlContains = String(r['Expected URL Contains'] || r['URL'] || '').trim() || undefined;

      const title =
        titleBase ||
        (expectSuccess
          ? `Authentication - User can login via iframe flow`
          : `Authentication - Invalid credentials show error`);

      scenarios.push({
        title,
        baseUrl: String(r['Base URL'] || r['baseUrl'] || defaults.baseUrl),
        username,
        password,
        expectSuccess,
        expectErrorText: expectSuccess ? '' : expectErrorText,
        expectedSelector,
        expectedUrlContains,
      });
    }

    if (scenarios.length === 0) {
      return buildFallback(defaults);
    }
    return scenarios;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to parse Excel, falling back to sample scenarios:', e);
    return buildFallback(defaults);
  }
}

function buildFallback(defaults) {
  const user = defaults.username || 'demo@example.com';
  const pass = defaults.password || 'Password123!';
  return [
    {
      title: 'Authentication - User can login via iframe flow (env/default)',
      baseUrl: defaults.baseUrl,
      username: user,
      password: pass,
      expectSuccess: true,
      expectErrorText: '',
    },
    {
      title: 'Authentication - Invalid password shows error',
      baseUrl: defaults.baseUrl,
      username: user,
      password: 'not-the-right-password',
      expectSuccess: false,
      expectErrorText: 'Invalid username or password',
    },
  ];
}

module.exports = {
  loadScenariosFromExcel,
};
