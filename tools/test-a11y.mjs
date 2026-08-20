#!/usr/bin/env node
/**
 * Static accessibility assertions over the built HTML, plus WCAG contrast
 * arithmetic over the CSS palette.
 *
 * WHY THIS EXISTS
 *
 * 199 pages carrying 88 data tables, a five-field form and a search box, and
 * nothing had ever checked any of it. Two real defects were sitting there:
 *
 *   Every section index and every city hub page jumped straight from <h1> to
 *   <h3>, because the card grid hard-coded <h3> and the "Shanghai in detail"
 *   label above it was a <p> styled to look like a heading. Thirteen pages,
 *   and a screen-reader user navigating by heading level found a hole where
 *   the section heading should be — and a visual heading that was not one.
 *
 *   Four colour pairings in the light palette were below the 4.5:1 floor.
 *   --ink-faint on --paper-sunk was 4.13:1, which is the breadcrumbs, the
 *   footer columns and the newsletter note: every page. --gold as text was
 *   2.94:1 on --gold-soft, which is every :::key callout title.
 *
 * WHAT THIS IS NOT
 *
 * It is not axe-core and it is not a screen reader. It cannot judge whether
 * alt text is *good*, whether the reading order makes sense, whether a focus
 * ring is visible enough in practice, or whether the page is usable — those
 * need a real browser and, ultimately, a real person. It checks the subset of
 * WCAG that is decidable from static HTML and a stylesheet, which is the
 * subset that silently regresses when someone edits a template.
 *
 * It deliberately does NOT re-check "exactly one <h1>" — src/check.mjs already
 * asserts that, and two tools disagreeing about one rule is worse than one
 * tool checking it.
 *
 * THE CONTRAST SECTION IS THE POINT
 *
 * No HTML check reaches colour. The palette lives in CSS custom properties, a
 * pairing is only a failure if that foreground is actually used on that
 * background, and both facts are in the stylesheet rather than the markup. So
 * the pairings below are enumerated by hand from real usage, and the ratios
 * are computed from the declared hex values on every run. Change a custom
 * property and this fails before the change ships.
 *
 * Run: npm run test:a11y
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const CSS = 'src/assets/styles.css';

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) return;
  failures++;
  console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
};

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
};

const urlOf = (file) => {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  return rel === 'index.html' ? '/' : `/${rel.replace(/index\.html$/, '')}`;
};

console.log('Accessibility');

const files = walk(DIST);
let tables = 0;
let anchors = 0;

// Anchor text that tells a screen-reader user nothing when read out of
// context, which is how a link list is read.
const VAGUE = /^(here|read more|click here|more|link|this|this page|learn more|continue)$/i;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const url = urlOf(file);
  const body = html.slice(html.indexOf('<body'));

  // -------------------------------------------------------------------------
  // Language, so a screen reader picks the right voice and pronunciation.
  // -------------------------------------------------------------------------
  check(`${url}: <html> has no lang attribute`, /<html[^>]+lang="[a-z]/i.test(html));

  // -------------------------------------------------------------------------
  // Positive tabindex overrides document order and is essentially always a bug.
  // -------------------------------------------------------------------------
  check(`${url}: has a positive tabindex`, !/tabindex="[1-9]/.test(html));

  // -------------------------------------------------------------------------
  // Heading levels must not skip.
  //
  // A screen-reader user navigates a long page by jumping between headings,
  // and the level is the outline. h1 -> h3 tells them a level exists that
  // they cannot reach.
  // -------------------------------------------------------------------------
  const levels = [...body.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    check(
      `${url}: heading level skips h${levels[i - 1]} → h${levels[i]}`,
      levels[i] - levels[i - 1] <= 1
    );
  }

  // -------------------------------------------------------------------------
  // Tables need header cells. The site is full of comparison tables — sights
  // with addresses and metro lines, visa schemes, minimum nights per city.
  // Without <th>, a screen reader reads 40 cells with no idea which column
  // any of them is in.
  // -------------------------------------------------------------------------
  for (const t of body.matchAll(/<table[\s\S]*?<\/table>/g)) {
    tables++;
    check(`${url}: a <table> has no <thead>`, /<thead/.test(t[0]));
    check(`${url}: a <table> has no <th> cells`, /<th[\s>]/.test(t[0]));
  }

  // -------------------------------------------------------------------------
  // Every link needs discernible, meaningful text.
  // -------------------------------------------------------------------------
  for (const a of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    anchors++;
    const attrs = a[1];
    const text = a[2].replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
    const labelled = /aria-label="[^"]+"/.test(attrs);
    check(`${url}: an <a> has no discernible text`, text.length > 0 || labelled, attrs.trim().slice(0, 90));
    check(`${url}: anchor text is just "${text}"`, !VAGUE.test(text), 'reads as nothing in a list of links');
  }

  // -------------------------------------------------------------------------
  // The skip link must exist, be the first focusable thing, and go somewhere.
  // -------------------------------------------------------------------------
  const skip = body.match(/<a class="skip-link" href="#([^"]+)"/);
  check(`${url}: has no skip link`, !!skip);
  if (skip) {
    check(`${url}: skip link targets #${skip[1]}, which does not exist`, html.includes(`id="${skip[1]}"`));
    const firstFocusable = body.match(/<(?:a|button|input|select|textarea)\b/);
    check(
      `${url}: the skip link is not the first focusable element`,
      firstFocusable && body.indexOf(skip[0]) === body.indexOf(firstFocusable[0]),
      'a keyboard user has to tab through something before reaching it'
    );
  }

  // -------------------------------------------------------------------------
  // Form controls need labels, and aria references need real targets.
  // -------------------------------------------------------------------------
  for (const c of body.matchAll(/<(select|textarea|input)\b([^>]*)>/g)) {
    const attrs = c[2];
    if (/type="(hidden|submit|button|image)"/.test(attrs)) continue;
    const id = attrs.match(/id="([^"]+)"/)?.[1];
    const labelled =
      /aria-label="[^"]+"/.test(attrs) ||
      /aria-labelledby="[^"]+"/.test(attrs) ||
      (id && body.includes(`for="${id}"`)) ||
      new RegExp(`<label[^>]*>\\s*<${c[1]}[^>]*${id ? `id="${id}"` : ''}`).test(body);
    check(`${url}: <${c[1]}${id ? ` id="${id}"` : ''}> has no label`, !!labelled, attrs.trim().slice(0, 90));
  }

  for (const m of body.matchAll(/aria-(?:labelledby|describedby|controls|owns)="([^"]+)"/g)) {
    for (const ref of m[1].split(/\s+/)) {
      check(`${url}: aria reference "${ref}" points at an id that does not exist`, html.includes(`id="${ref}"`));
    }
  }

  // -------------------------------------------------------------------------
  // Images need alt. The site ships no raster images today, so this is a lock
  // rather than a finding — the first one added should not arrive bare.
  // -------------------------------------------------------------------------
  for (const img of body.matchAll(/<img\b[^>]*>/g)) {
    check(`${url}: an <img> has no alt attribute`, /alt="/.test(img[0]), img[0].slice(0, 90));
  }
}

console.log(`\n  ${files.length} page(s) · ${tables} table(s) · ${anchors} link(s)`);

// ---------------------------------------------------------------------------
// Colour contrast, computed from the declared palette.
//
// WCAG 2.1 relative luminance and contrast ratio, per the spec:
//   channel c in [0,1]:  c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4
//   L = 0.2126*R + 0.7152*G + 0.0722*B
//   ratio = (Llighter + 0.05) / (Ldarker + 0.05)
//
// Threshold 4.5 for normal text, 3 for large text (>=24px, or >=18.66px bold)
// and for the boundaries of user interface components under 1.4.11.
// ---------------------------------------------------------------------------

const css = fs.readFileSync(CSS, 'utf8');

const varsIn = (block) => {
  const out = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) out[m[1]] = m[2];
  return out;
};

// The light palette is declared on :root; the dark one inside the
// prefers-color-scheme block, which overrides only some of the same names.
const darkStart = css.indexOf('prefers-color-scheme: dark');
const light = varsIn(css.slice(0, darkStart));
const dark = { ...light, ...varsIn(css.slice(darkStart, css.indexOf('}', css.indexOf('}', darkStart) + 1) + 400)) };

const srgb = (h) => h.replace('#', '').match(/../g).map((v) => parseInt(v, 16) / 255);
const lum = (h) =>
  srgb(h)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + [0.2126, 0.7152, 0.0722][i] * c, 0);
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Enumerated from real usage in styles.css, not from every possible pairing.
// A pairing that no rule actually produces is not a failure, and asserting it
// would force the palette to satisfy constraints the design never imposes.
const PAIRINGS = [
  ['body text', 'ink', 'paper', 4.5],
  ['body text on raised surfaces', 'ink', 'paper-raised', 4.5],
  ['muted text — standfirst, card descriptions', 'ink-soft', 'paper', 4.5],
  ['faint text — article meta, card meta', 'ink-faint', 'paper', 4.5],
  ['faint text on sunk — breadcrumbs, footer, newsletter note', 'ink-faint', 'paper-sunk', 4.5],
  ['links', 'red', 'paper', 4.5],
  ['link hover', 'red-dark', 'paper', 4.5],
  ['warn callout body', 'ink', 'red-soft', 4.5],
  ['warn callout title', 'red', 'red-soft', 4.5],
  ['tip callout body', 'ink', 'jade-soft', 4.5],
  ['tip callout title', 'jade', 'jade-soft', 4.5],
  ['key callout body', 'ink', 'gold-soft', 4.5],
  ['key callout title', 'gold', 'gold-soft', 4.5],
  ['local callout title on paper', 'gold', 'paper', 4.5],
  ['promo-slot label on raised', 'gold', 'paper-raised', 4.5],
  ['money callout title', 'jade', 'paper', 4.5],
];

for (const [mode, palette] of [['light', light], ['dark', dark]]) {
  for (const [name, fg, bg, threshold] of PAIRINGS) {
    if (!palette[fg] || !palette[bg]) {
      check(`${mode}: palette has no --${fg} or --${bg}`, false);
      continue;
    }
    const r = contrast(palette[fg], palette[bg]);
    check(
      `${mode}: ${name} — ${r.toFixed(2)}:1`,
      r >= threshold,
      `${palette[fg]} on ${palette[bg]} needs ${threshold}:1`
    );
  }
}

// ---------------------------------------------------------------------------
// The form controls' own border, read from the rule that draws it.
//
// WCAG 1.4.11 asks for 3:1 on "visual information required to identify user
// interface components" — the edge of a select or a number field is exactly
// that, while a rule between two paragraphs is not. So --line stays at 1.35:1
// where it is decorative and must not be used here.
//
// This started life as a row in the table above, asserting --ink-faint against
// --paper. Sabotage showed it was decoration: putting the border back to
// --line did not fail it, because a pairing listed by hand proves nothing
// about which variable the rule actually names. It has to READ the rule.
// ---------------------------------------------------------------------------

const controlRule = css.match(
  /\.visa-tool select[^{]*\{[^}]*?border:\s*1px solid var\(--([a-z-]+)\)/
);
check(
  'could not find the visa-tool control border rule in styles.css',
  !!controlRule,
  'the selector moved — this assertion is now blind'
);
if (controlRule) {
  const token = controlRule[1];
  for (const [mode, palette] of [['light', light], ['dark', dark]]) {
    const r = contrast(palette[token], palette.paper);
    check(
      `${mode}: form control border uses --${token} — ${r.toFixed(2)}:1 against --paper`,
      r >= 3,
      `WCAG 1.4.11 needs 3:1 for a control's boundary; ${palette[token]} on ${palette.paper}`
    );
  }
}

console.log(`  ${PAIRINGS.length} colour pairing(s) × 2 themes checked, plus the control border`);
console.log(failures ? `\n${failures} failure(s).` : '\n✓ All accessibility assertions passed.');
process.exit(failures ? 1 : 0);
