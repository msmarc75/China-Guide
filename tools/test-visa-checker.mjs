#!/usr/bin/env node
/**
 * Functional tests for the visa checker: decision logic, the shareable link,
 * mobile layout, and the no-JavaScript fallback.
 *
 * Needs playwright and a running preview server:
 *   npm run build && npm run serve &
 *   CHROMIUM_PATH=/path/to/chromium node tools/test-visa-checker.mjs
 */

import { chromium } from 'playwright';

const BASE = process.env.AUDIT_BASE || 'http://localhost:4321';
const PAGE = `${BASE}/tools/china-visa-checker/`;
const launchOptions = process.env.CHROMIUM_PATH
  ? { executablePath: process.env.CHROMIUM_PATH }
  : {};

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  }
};

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

async function scenario({ country, days, onward = false, hainan = false }) {
  await page.goto(PAGE, { waitUntil: 'networkidle' });
  await page.selectOption('#visa-country', country);
  await page.fill('#visa-days', String(days));
  if (onward) await page.check('#visa-onward');
  if (hainan) await page.check('#visa-hainan');
  await page.click('#visa-form button[type="submit"]');
  await page.waitForSelector('.visa-result', { timeout: 5000 });
  return {
    verdict: (await page.textContent('.visa-result__verdict')).replace(/\s+/g, ' ').trim(),
    scheme: (await page.textContent('.visa-result h3')).trim(),
    hash: page.url().includes('#') ? `#${page.url().split('#')[1]}` : '',
  };
}

console.log('Visa checker — decision logic');

const fr = await scenario({ country: 'FR', days: 14 });
check('a French passport gets 30-day visa-free entry', fr.scheme.includes('Visa-free entry, 30 days'), fr.scheme);

const usHome = await scenario({ country: 'US', days: 14 });
check('a US passport returning home needs a visa', usHome.verdict.includes('You need a visa'), usHome.verdict);

const usOnward = await scenario({ country: 'US', days: 8, onward: true });
check('a US passport exiting to a third country gets 240-hour transit', usOnward.scheme.includes('240-hour'), usOnward.scheme);

const frLong = await scenario({ country: 'FR', days: 45 });
check('a stay beyond the scheme limit falls back to a visa', frLong.verdict.includes('You need a visa'), frLong.verdict);

const hainan = await scenario({ country: 'US', days: 10, hainan: true });
check('a Hainan-only trip is recognised', hainan.scheme.includes('Hainan'), hainan.scheme);

console.log('\nShareable results');
check('the answer is encoded in the URL hash', usOnward.hash.includes('c=US') && usOnward.hash.includes('t=1'), usOnward.hash);

await page.goto(PAGE, { waitUntil: 'networkidle' });
await page.evaluate((h) => { window.location.hash = h.slice(1); }, usOnward.hash);
await page.waitForTimeout(300);
check(
  'pasting a shared link on the open page restores the answer',
  (await page.textContent('.visa-result h3')).includes('240-hour')
);

await page.goto(PAGE + usOnward.hash, { waitUntil: 'networkidle' });
check(
  'opening a shared link from cold restores the answer',
  (await page.textContent('.visa-result h3')).includes('240-hour')
);

console.log('\nLayout and resilience');
for (const width of [320, 390]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(PAGE, { waitUntil: 'networkidle' });
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  check(`no horizontal overflow at ${width}px`, !overflows);
}

await browser.close();

const noJs = await chromium.launch(launchOptions);
const context = await noJs.newContext({ javaScriptEnabled: false });
const plain = await context.newPage();
await plain.goto(PAGE, { waitUntil: 'domcontentloaded' });
const rows = await plain.locator('.visa-tool__table tbody tr').count();
check(`the full rules table renders without JavaScript (${rows} countries)`, rows > 50);
await noJs.close();

check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));

console.log(failures ? `\n${failures} failure(s).` : '\n✓ All visa checker assertions passed.');
process.exit(failures ? 1 : 0);
