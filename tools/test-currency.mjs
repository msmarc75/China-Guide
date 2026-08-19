#!/usr/bin/env node
/**
 * Every "¥X (US$Y)" pair in the corpus must be consistent with one declared
 * exchange rate.
 *
 * WHY THIS EXISTS
 *
 * The budget page declared ¥7.1 to the dollar and twenty conversions across six
 * files were computed from it. The yuan then strengthened about six per cent
 * over a year, and by the August 2026 freshness pass the real rate was ¥6.73 —
 * so every dollar figure on the site overstated the cost of a China trip by
 * roughly five per cent, and nothing could notice.
 *
 * That is the same shape as the visa defect this pass also found: one number
 * stated in prose, many numbers derived from it by hand, and no link between
 * them. The fix is the same — assert the derived values against the source.
 *
 * This test does NOT check that the rate is current; no test can, without a
 * network call. It checks INTERNAL CONSISTENCY: if someone updates the rate,
 * every conversion must be updated with it, and the failure names each one.
 * Keeping the rate current is a freshness-pass job, and `RATE_REVIEWED` below
 * records when that last happened.
 *
 * Run: npm run test:currency
 */

import fs from 'node:fs';
import path from 'node:path';

const CONTENT = 'src/content';

/**
 * The rate every conversion in the corpus is computed at, and the date it was
 * last checked against a live source. Spot was 6.73 on 2026-08-19; 6.75 is the
 * rounded working rate, which keeps the arithmetic legible.
 */
const RATE = 6.75;
const RATE_REVIEWED = '2026-08-19';

// Conversions are rounded for readability, so the tolerance has to absorb that
// rather than demand exactness. Measured across the corpus, the worst rounding
// drift is 0.44%, so 2% is generous headroom — and it is tight enough to catch
// the defect this was written for, which was 5.3% off.
//
// I set this to 10% first, then sabotaged a figure to check the test worked and
// found it did not: the 5.3% error sailed through. A tolerance chosen by
// intuition rather than measurement made the test decorative.
const TOLERANCE = 0.02;

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
};

const num = (s) => Number(s.replace(/,/g, ''));

// ¥250–400 a day (US$37–59) · ¥3,850 (US$570) · ¥600–900 (US$89–133)
// The yuan and dollar figures may be separated by a few words, so allow a short
// gap, but not enough to pair up two unrelated amounts.
const PAIR =
  /¥([\d,]+)(?:\s*[–—-]\s*([\d,]+))?[^()¥]{0,40}?\(US\$([\d,]+)(?:\s*[–—-]\s*([\d,]+))?\)/g;

let failures = 0;
let checked = 0;
const check = (label, ok, detail = '') => {
  if (ok) return;
  failures++;
  console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
};

console.log('Currency conversions');

for (const file of walk(CONTENT)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(PAIR)) {
    const [full, y1, y2, d1, d2] = m;
    const pairs = y2 && d2
      ? [[num(y1), num(d1)], [num(y2), num(d2)]]
      : [[num(y1), num(d1)]];
    for (const [yuan, usd] of pairs) {
      checked++;
      const expected = yuan / RATE;
      const drift = Math.abs(usd - expected) / expected;
      check(
        `${file.replace(`${CONTENT}/`, '')}: ¥${yuan} → US$${usd}`,
        drift <= TOLERANCE,
        `expected about US$${Math.round(expected)} at ¥${RATE}/US$ — off by ${(drift * 100).toFixed(1)}%  ·  "${full.trim()}"`
      );
    }
  }
}

// The declared rate must appear on the budget page, so a reader can see what
// the conversions assume and there is one place to change it.
const budget = fs.readFileSync(path.join(CONTENT, 'plan', 'china-trip-cost-budget.md'), 'utf8');
check(
  `the budget page states the ¥${RATE} rate the conversions use`,
  budget.includes(`¥${RATE} to the US dollar`),
  'update tools/test-currency.mjs and the page together'
);

console.log(`\n  ${checked} conversion(s) checked at ¥${RATE}/US$ · rate last reviewed ${RATE_REVIEWED}`);
console.log(failures ? `\n${failures} failure(s).` : '\n✓ All currency assertions passed.');
process.exit(failures ? 1 : 0);
