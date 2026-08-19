#!/usr/bin/env node
/**
 * Mobile layout audit: loads pages at phone widths and fails on horizontal
 * overflow — the defect class that wide tables and long unbroken strings cause.
 *
 * Optional tool. Playwright is NOT a project dependency, so install it ad hoc:
 *   npm i -D playwright && npx playwright install chromium
 *   npm run build && npm run serve &   # then:
 *   node tools/mobile-audit.mjs
 *
 * Add every new page template here as content grows.
 */

const BASE = process.env.AUDIT_BASE || 'http://localhost:4321';
const WIDTHS = [320, 360, 390, 430];
const PAGES = [
  '/',
  '/plan/china-trip-cost-budget/',
  '/guides/china-visa-guide/',
  '/guides/transport-in-china/',
  '/destinations/beijing/',
  '/destinations/beijing/things-to-do/',
  '/destinations/beijing/restaurants/',
  '/destinations/beijing/nightlife/',
  '/destinations/beijing/massage-and-spa/',
  '/destinations/shanghai/things-to-do/',
  '/destinations/shanghai/restaurants/',
  '/destinations/shanghai/nightlife/',
  '/destinations/shanghai/massage-and-spa/',
  '/destinations/xian/things-to-do/',
  '/destinations/xian/restaurants/',
  '/destinations/xian/nightlife/',
  '/destinations/xian/massage-and-spa/',
  '/destinations/chengdu/things-to-do/',
  '/destinations/chengdu/restaurants/',
  '/destinations/chengdu/nightlife/',
  '/destinations/chengdu/massage-and-spa/',
  '/destinations/quanzhou/',
  '/destinations/',
  '/itineraries/china-14-day-itinerary/',
  '/food/chinese-cuisine-regional-guide/',
  '/answers/',
  '/answers/how-much-cash-should-i-bring-to-china/',
  '/tools/china-visa-checker/',
  '/search/',
];

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright not installed — see the header of this file.');
  process.exit(2);
}

// CHROMIUM_PATH lets the audit reuse a browser that is already on the machine
// (CI images and sandboxes often ship one) instead of downloading another.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
let failures = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 });
    const result = await page.evaluate(() => {
      const offenders = new Set();
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.right > window.innerWidth + 1) {
          // Elements inside a deliberate horizontal scroller are fine.
          if (!el.closest('.table-wrap, pre')) {
            offenders.add(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
          }
        }
      }
      return {
        scrollWidth: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        offenders: [...offenders].slice(0, 6),
      };
    });

    const overflows = result.scrollWidth > result.viewport + 1 || result.offenders.length > 0;
    if (overflows) {
      failures++;
      console.log(`✗ ${width}px ${path} — scrollWidth ${result.scrollWidth} · ${result.offenders.join(', ')}`);
    }
  }
  await page.close();
}

await browser.close();

if (failures) {
  console.log(`\n${failures} overflow failure(s).`);
  process.exit(1);
}
console.log(`✓ No horizontal overflow across ${WIDTHS.length} widths × ${PAGES.length} pages.`);
