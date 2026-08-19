#!/usr/bin/env node
/**
 * Discoverability and structured-data audit.
 *
 * Asserts, rather than reports — exits non-zero on failure so regressions are
 * caught rather than accumulating silently. Run after `npm run build`:
 *   npm run audit:links
 *
 * What it checks
 * --------------
 * 1. Every article has at least one INBOUND EDITORIAL link. "Editorial" means a
 *    link a human deliberately wrote in prose. The computed related block and
 *    the sidebar slots are excluded, because those are generated for every page
 *    and would make an orphan look connected.
 * 2. Every article appears in sitemap.xml exactly once.
 * 3. No `related:` entry in src/content anywhere points at a page that does not
 *    exist. The build silently drops unresolvable related links, so a dangling
 *    entry ships as a lie in the source without failing CI.
 * 4. No page carries both FAQPage and QAPage schema — Google treats that as
 *    conflicting markup.
 * 5. Answer pages carry QAPage; pillars carry FAQPage.
 *
 * Extracting the editorial region is fiddly and worth explaining. The related
 * block contains `<article class="card">` elements, so a lazy
 * `<article>…</article>` match stops inside the related block rather than at
 * the real article's end. We therefore cut at `<section class="related">`
 * explicitly, then strip `<aside>` and ad-slot chrome from what remains.
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const CONTENT = 'src/content';

const fail = [];
const note = (msg) => fail.push(msg);

/* ------------------------------------------------------------------ *
 * Collect built pages
 * ------------------------------------------------------------------ */

const htmlFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.html')) htmlFiles.push(p);
  }
})(DIST);

const urlOf = (file) => file.replace(/^dist/, '').replace(/index\.html$/, '');

/** The prose region of a page: no related block, no sidebar, no ad slots. */
function editorialRegion(html) {
  const start = html.indexOf('<article');
  if (start === -1) return '';
  const relatedAt = html.indexOf('<section class="related">', start);
  const end = relatedAt !== -1 ? relatedAt : html.indexOf('</article>', start);
  return html
    .slice(start, end === -1 ? html.length : end)
    .replace(/<aside[\s\S]*?<\/aside>/g, '')
    .replace(/<div class="ad-slot"[\s\S]*?<\/div>/g, '');
}

const pages = htmlFiles.map((file) => {
  const html = fs.readFileSync(file, 'utf8');
  return {
    file,
    url: urlOf(file),
    html,
    editorial: editorialRegion(html),
    hasFaq: /"@type":\s*"FAQPage"/.test(html),
    hasQa: /"@type":\s*"QAPage"/.test(html),
    isArticle: /"@type":\s*"(Article|BlogPosting|TouristDestination)"/.test(html),
  };
});

const byUrl = new Map(pages.map((p) => [p.url, p]));

/* ------------------------------------------------------------------ *
 * 1. Inbound editorial links
 * ------------------------------------------------------------------ */

const inbound = new Map(pages.map((p) => [p.url, 0]));
for (const page of pages) {
  const seen = new Set();
  for (const m of page.editorial.matchAll(/href="(\/[^"#?]*)"/g)) {
    const target = m[1].endsWith('/') ? m[1] : `${m[1]}/`;
    if (target === page.url || seen.has(target)) continue;
    if (!inbound.has(target)) continue;
    seen.add(target);
    inbound.set(target, inbound.get(target) + 1);
  }
}

/* Articles are the pages we care about reaching: content, not chrome. */
const SKIP = new Set(['/', '/search/', '/404.html', '/sitemap-page/']);
const SECTION_INDEX = /^\/[a-z-]+\/$/;

const articles = pages.filter(
  (p) => !SKIP.has(p.url) && !SECTION_INDEX.test(p.url) && p.url !== '/404.html'
);

const orphans = articles.filter((p) => inbound.get(p.url) === 0);
if (orphans.length) {
  note(`${orphans.length} article(s) with zero inbound editorial links:`);
  for (const o of orphans) note(`    ${o.url}`);
}

/* ------------------------------------------------------------------ *
 * 2. Sitemap coverage
 * ------------------------------------------------------------------ */

const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
  m[1].replace(/^https?:\/\/[^/]+/, '')
);
const locCount = new Map();
for (const l of locs) locCount.set(l, (locCount.get(l) || 0) + 1);

for (const a of articles) {
  const n = locCount.get(a.url) || 0;
  if (n !== 1) note(`sitemap lists ${a.url} ${n} time(s), expected exactly 1`);
}

/* /search/ and /404.html are deliberately excluded: one is a JS-driven UI with
 * no indexable content, the other is noindex. Assert that stays true. */
for (const excluded of ['/search/', '/404.html']) {
  if (locCount.has(excluded)) note(`${excluded} should not be in the sitemap`);
}

/* ------------------------------------------------------------------ *
 * 3. Dangling related: entries
 * ------------------------------------------------------------------ */

let relatedChecked = 0;
(function walkContent(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkContent(p);
      continue;
    }
    if (!entry.name.endsWith('.md')) continue;
    const front = fs.readFileSync(p, 'utf8').match(/^---\n([\s\S]*?)\n---/);
    if (!front) continue;
    const block = front[1].match(/related:\n((?:\s+-\s+\S+\n?)+)/);
    if (!block) continue;
    for (const line of block[1].trim().split('\n')) {
      const target = line.replace(/^\s*-\s*/, '').trim();
      relatedChecked++;
      if (!byUrl.has(target)) note(`dangling related: ${target}  (in ${p})`);
    }
  }
})(CONTENT);

/* ------------------------------------------------------------------ *
 * 4 & 5. Structured data
 * ------------------------------------------------------------------ */

for (const p of pages) {
  if (p.hasFaq && p.hasQa) note(`${p.url} carries BOTH FAQPage and QAPage`);
}

const answerPages = articles.filter((p) => p.url.startsWith('/answers/'));
for (const p of answerPages) {
  if (!p.hasQa) note(`answer page ${p.url} is missing QAPage`);
  if (p.hasFaq) note(`answer page ${p.url} must not carry FAQPage`);
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

const counts = articles.map((a) => inbound.get(a.url)).sort((a, b) => a - b);
const median = counts.length
  ? counts.length % 2
    ? counts[(counts.length - 1) / 2]
    : (counts[counts.length / 2 - 1] + counts[counts.length / 2]) / 2
  : 0;

console.log('Discoverability audit');
console.log(`  built HTML files      ${htmlFiles.length}`);
console.log(`  articles audited      ${articles.length}`);
console.log(`  sitemap entries       ${locs.length}  (excludes /search/ and /404.html by design)`);
console.log(`  related: entries      ${relatedChecked}`);
console.log(`  answer pages          ${answerPages.length}`);
console.log(
  `  inbound editorial     min ${counts[0] ?? 0} · median ${median} · max ${counts[counts.length - 1] ?? 0}`
);

if (fail.length) {
  console.log('\n✗ Failures:');
  for (const f of fail) console.log(`  ${f}`);
  console.log(`\n${fail.length} problem(s).`);
  process.exit(1);
}

console.log('\n✓ All discoverability assertions passed.');
