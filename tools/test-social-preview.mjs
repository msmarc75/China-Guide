#!/usr/bin/env node
/**
 * Every page's link preview must actually render when the page is shared.
 *
 * WHY THIS EXISTS
 *
 * All 199 pages pointed `og:image` and `twitter:image` at
 * `/assets/og-default.svg`. No platform that enumerates accepted formats for a
 * link preview lists SVG: LinkedIn's own help gives "JPG, PNG, or GIF",
 * Facebook's image guidance specifies dimensions and an 8MB ceiling without
 * ever admitting a vector format, and the ecosystem is full of tools built for
 * no purpose other than converting an SVG og:image into a PNG.
 *
 * I could not obtain X's format list — its developer docs returned 402 and
 * then 404 — so this is stated as the agreed part of what the sources do say
 * rather than as a complete platform survey. It is enough, because the
 * decision does not depend on certainty that SVG fails: a PNG renders
 * everywhere an SVG might have, so switching costs nothing even where SVG
 * would have been tolerated.
 *
 * The preview image is the single most visible thing about a shared link. A
 * format that silently renders nothing is not a cosmetic issue, and nothing
 * here would ever have reported it: the tag was present, the file existed, the
 * URL resolved. Every check the project had would pass on a totally broken
 * preview.
 *
 * WHAT ELSE WAS MISSING
 *
 * `og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image:alt`
 * were not emitted at all. Dimensions let a platform lay out the card before
 * the image has downloaded; the alt text is read aloud when someone using a
 * screen reader meets the shared card.
 *
 * WHAT IT DOES NOT CHECK
 *
 * It does not fetch anything and cannot ask a platform to render a card. It
 * cannot tell you whether the image is a GOOD one, and it cannot see that all
 * 199 pages currently share a single image — which is true, and is a real
 * limitation of the site, but a per-page image is a much larger piece of work
 * than this and should be decided on its merits rather than smuggled in behind
 * a format fix.
 *
 * The dimensions assertion reads the PNG's own IHDR chunk rather than trusting
 * the markup, so the declared size cannot drift from the asset.
 *
 * Run: npm run test:social
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';

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

/** Width and height straight out of a PNG's IHDR chunk. */
const pngSize = (file) => {
  const b = fs.readFileSync(file);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!b.subarray(0, 8).equals(signature)) return null;
  if (b.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};

const { SITE } = await import('../src/content/site.mjs');
const ORIGIN = SITE.url;

// Formats a link-preview crawler will actually rasterise. SVG is deliberately
// absent — that is the defect this file exists for.
const RASTER = /\.(png|jpe?g|webp|gif)$/i;

// Long enough to be useful, short enough not to be cut off in a card.
const TITLE_MAX = 90;
const DESC_MIN = 50;
const DESC_MAX = 300;

const CARD_TYPES = new Set(['summary', 'summary_large_image', 'app', 'player']);

console.log('Social and search preview');

const files = walk(DIST);
check('no built pages found', files.length > 0);

const images = new Set();
let checked = 0;

for (const file of files) {
  const url = urlOf(file);
  if (url === '/404.html') continue;
  const html = fs.readFileSync(file, 'utf8');
  checked++;

  const meta = (key) =>
    html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1] ?? null;

  for (const key of [
    'og:type',
    'og:site_name',
    'og:title',
    'og:description',
    'og:url',
    'og:image',
    'og:image:alt',
  ]) {
    check(`${url}: ${key} is missing or empty`, (meta(key) ?? '').trim().length > 0);
  }
  for (const key of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
    check(`${url}: ${key} is missing or empty`, (meta(key) ?? '').trim().length > 0);
  }

  const ogUrl = meta('og:url');
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  check(`${url}: og:url ${ogUrl} does not match canonical ${canonical}`, ogUrl === canonical);

  const card = meta('twitter:card');
  check(`${url}: twitter:card "${card}" is not a card type`, CARD_TYPES.has(card));

  const title = meta('og:title') ?? '';
  const desc = meta('og:description') ?? '';
  check(`${url}: og:title is ${title.length} chars`, title.length <= TITLE_MAX, `over ${TITLE_MAX} truncates in a card`);
  check(
    `${url}: og:description is ${desc.length} chars`,
    desc.length >= DESC_MIN && desc.length <= DESC_MAX,
    `outside ${DESC_MIN}–${DESC_MAX}`
  );

  for (const key of ['og:image', 'twitter:image']) {
    const src = meta(key);
    if (!src) continue;
    check(`${url}: ${key} is not absolute on ${ORIGIN}`, src.startsWith(`${ORIGIN}/`), src);
    check(
      `${url}: ${key} is not a raster format`,
      RASTER.test(src),
      'link-preview crawlers rasterise PNG, JPEG, WebP and GIF — an SVG renders as no image at all'
    );
    images.add(src);
  }

  // Declared dimensions must match the file, not each other.
  const declaredW = Number(meta('og:image:width'));
  const declaredH = Number(meta('og:image:height'));
  check(`${url}: og:image:width is not a number`, Number.isInteger(declaredW) && declaredW > 0);
  check(`${url}: og:image:height is not a number`, Number.isInteger(declaredH) && declaredH > 0);

  const src = meta('og:image');
  if (src?.startsWith(`${ORIGIN}/`)) {
    const asset = path.join(DIST, src.slice(ORIGIN.length));
    check(`${url}: og:image ${src} is not in dist/`, fs.existsSync(asset));
    if (fs.existsSync(asset) && asset.endsWith('.png')) {
      const size = pngSize(asset);
      check(`${url}: og:image is not a readable PNG`, !!size);
      if (size) {
        check(
          `${url}: og:image:width ${declaredW} but the file is ${size.width}`,
          declaredW === size.width
        );
        check(
          `${url}: og:image:height ${declaredH} but the file is ${size.height}`,
          declaredH === size.height
        );
        check(
          `${url}: og:image is ${size.width}x${size.height}, under the 1200x630 platforms ask for`,
          size.width >= 1200 && size.height >= 630
        );
        const ratio = size.width / size.height;
        check(
          `${url}: og:image aspect ratio is ${ratio.toFixed(2)}:1`,
          Math.abs(ratio - 1.91) < 0.06,
          'cards crop away from 1.91:1'
        );
      }
    }
  }
}

console.log(`\n  ${checked} page(s) · ${images.size} distinct preview image(s)`);
for (const i of images) {
  const asset = path.join(DIST, i.slice(ORIGIN.length));
  const size = fs.existsSync(asset) ? pngSize(asset) : null;
  const kb = fs.existsSync(asset) ? (fs.statSync(asset).size / 1024).toFixed(0) : '?';
  console.log(`      ${i.slice(ORIGIN.length)}  ${size ? `${size.width}x${size.height}` : 'not a PNG'}  ${kb}KB`);
}
console.log(failures ? `\n${failures} failure(s).` : '\n✓ All social-preview assertions passed.');
process.exit(failures ? 1 : 0);
