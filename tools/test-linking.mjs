#!/usr/bin/env node
/**
 * Asserts the internal link graph of the real site: relatedness is computed
 * rather than hand-maintained, and no page is left without inbound editorial
 * links as the site grows.
 *
 * Run: npm run test:linking   (expects dist/ to be built)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
const urlOf = (file) => {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  return rel === 'index.html' ? '/' : `/${rel.replace(/index\.html$/, '')}`;
};

const isListing = (url) => url === '/' || url === '/sitemap-page/' || /^\/[^/]+\/$/.test(url);
const isArticle = (url) => !isListing(url) && !url.endsWith('404.html') && url !== '/search/';

// Count only editorial links: inside <main>, and not from an automatic listing.
const inbound = new Map();
for (const file of htmlFiles) {
  const url = urlOf(file);
  if (isListing(url)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const main = /<main id="main">([\s\S]*)<\/main>/.exec(html)?.[1] || '';
  for (const m of main.matchAll(/href="(\/[^"#?]*)"/g)) {
    if (m[1] !== url) inbound.set(m[1], (inbound.get(m[1]) || 0) + 1);
  }
}

const articles = htmlFiles.map(urlOf).filter(isArticle);
const counts = articles.map((u) => inbound.get(u) || 0);

let failures = 0;
const check = (label, condition, detail = '') => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  }
};

console.log('Internal link graph');

const orphans = articles.filter((u) => !inbound.get(u));
check('no article is an orphan', orphans.length === 0, orphans.join(', '));

const thin = articles.filter((u) => (inbound.get(u) || 0) < 2);
check('every article has at least 2 inbound editorial links', thin.length === 0, thin.join(', '));

check(
  'every article renders a related block',
  htmlFiles
    .filter((f) => isArticle(urlOf(f)))
    .every((f) => fs.readFileSync(f, 'utf8').includes('class="related"'))
);

// Relatedness must be earned, not random: a destination page should mostly
// point at other destinations.
const beijing = fs.readFileSync(path.join(DIST, 'destinations', 'beijing', 'index.html'), 'utf8');
const relatedBlock = /<section class="related">([\s\S]*?)<\/section>/.exec(beijing)?.[1] || '';
const relatedLinks = [...relatedBlock.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
check('related links are present on a sample page', relatedLinks.length >= 3, String(relatedLinks.length));
check(
  'related links are topically plausible',
  relatedLinks.filter((u) => u.startsWith('/destinations/')).length >= 1,
  relatedLinks.join(', ')
);

const median = [...counts].sort((a, b) => a - b)[Math.floor(counts.length / 2)];
console.log(`\n  ${articles.length} articles · min ${Math.min(...counts)} · median ${median} inbound links`);

console.log(failures ? `\n${failures} failure(s).` : '\n✓ All link-graph assertions passed.');
process.exit(failures ? 1 : 0);
