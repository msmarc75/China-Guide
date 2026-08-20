#!/usr/bin/env node
/**
 * The sitemap, the feed and robots.txt must agree with each other and with
 * the pages that actually built.
 *
 * WHY THIS EXISTS
 *
 * `dist/sitemap.xml`, `dist/feed.xml` and `dist/robots.txt` are regenerated on
 * every build, and `src/check.mjs` asserted exactly one thing about each: that
 * the file exists. That is the same shape that had already paid twice — the
 * search index had an existence check and nothing else, and the JSON-LD had
 * nothing at all.
 *
 * It matters more here than it looks. A sitemap that drops half the corpus, or
 * lists a URL that 404s, or contradicts robots.txt, costs indexing directly
 * and silently. Search Console would eventually say so; nothing in this
 * repository would say so at all, and by the time it showed up in traffic the
 * cause would be many commits back.
 *
 * THE ASSERTION WORTH THE MOST
 *
 * `<lastmod>` against the page's own `updated:` front matter. Those are two
 * hand-maintained values with nothing connecting them, which is precisely the
 * shape of the two defects the freshness passes found: the exchange rate
 * stated once and derived twenty times, and the visa totals stated in prose
 * and never compared to the arrays. A wrong lastmod tells a crawler not to
 * bother re-reading a page that changed.
 *
 * The comparison is only worth anything because the two sides come from
 * different places — the sitemap from `dist/`, the front matter from
 * `src/content/`. A check that reads one value twice proves nothing, which is
 * what sabotage 13 in the structured-data work demonstrated.
 *
 * Its honest limit: because the generator reads the same field, editing
 * `updated:` and rebuilding moves both sides together and this stays quiet —
 * verified, not assumed. It catches the generator losing or corrupting a
 * lastmod, and a dist/ that has drifted from source. It cannot catch a page
 * edited without bumping `updated:`, because nothing static can: only the
 * author knows whether a change was substantive.
 *
 * MAPPING SOURCE FILES TO URLS
 *
 * `readContentDir()` in the build has one special case: files under
 * `src/content/pages/` map to root URLs, so `pages/about.md` is `/about/`,
 * while everything else is `/<section>/<slug>/`. Getting that wrong is not
 * hypothetical — the exploratory probe that preceded this file reported five
 * sitemap entries as having no front matter behind them, purely because it
 * mapped `/about/` to `/pages/about/`. The sitemap was correct and the probe
 * was not.
 *
 * WHAT IT DOES NOT CHECK
 *
 * It is not an XML validator and does not fetch anything. It cannot tell you
 * whether Google will index a page, whether the priority and changefreq hints
 * are sensible (they are hints and largely ignored), or whether the feed reads
 * well. It checks internal agreement, which is the part that breaks silently.
 *
 * Run: npm run test:sitemap
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const CONTENT = 'src/content';

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) return;
  failures++;
  console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
};

const walk = (dir, ext, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
};

const urlOfHtml = (file) => {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  return rel === 'index.html' ? '/' : `/${rel.replace(/index\.html$/, '')}`;
};

/** The build's own rule: pages/ is root, everything else is /section/slug/. */
const urlOfMarkdown = (file) => {
  const rel = path.relative(CONTENT, file).replace(/\\/g, '/').replace(/\.md$/, '');
  return rel.startsWith('pages/') ? `/${rel.slice('pages/'.length)}/` : `/${rel}/`;
};

console.log('Sitemap, feed and robots');

// The canonical origin comes from site config, not from a literal here — a
// test that hardcodes the domain keeps passing after someone changes it.
//
// IMPORT the module rather than pattern-matching the file. The first version
// of this grepped for `origin:` and the field is called `url`, so ORIGIN came
// out empty and every one of the 1,037 assertions below failed against a
// perfectly correct sitemap. The value is also computed
// (`process.env.SITE_URL || '…'`), so no literal match would have been safe
// even with the right key.
const { SITE } = await import('../src/content/site.mjs');
const ORIGIN = SITE.url;
check('site config has no url', typeof ORIGIN === 'string' && ORIGIN.startsWith('https://'));

const built = new Set(walk(DIST, '.html').map(urlOfHtml));

// Pages that are deliberately not in the sitemap. /search/ is a tool, not
// content, and robots.txt disallows it; 404 is an error page.
const NOT_INDEXED = new Set(['/404.html', '/search/']);

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

const sitemapPath = path.join(DIST, 'sitemap.xml');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');

check('sitemap.xml has no <urlset> root', /<urlset[\s>]/.test(sitemap));

const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: m[1].match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '',
  lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? null,
}));

check('sitemap.xml contains no <url> entries', entries.length > 0);

const today = new Date().toISOString().slice(0, 10);
const seen = new Set();
const sitemapUrls = new Set();

for (const e of entries) {
  check('a sitemap entry has no <loc>', !!e.loc);
  if (!e.loc) continue;

  check(`sitemap loc is not on ${ORIGIN}: ${e.loc}`, e.loc.startsWith(`${ORIGIN}/`));
  check(`sitemap loc is not https: ${e.loc}`, e.loc.startsWith('https://'));

  const url = e.loc.slice(ORIGIN.length) || '/';
  sitemapUrls.add(url);

  check(`sitemap lists ${url}, which is not in dist/`, built.has(url));
  check(`sitemap lists ${url} more than once`, !seen.has(url));
  seen.add(url);
  check(`sitemap lists ${url}, which is deliberately not indexed`, !NOT_INDEXED.has(url));

  if (e.lastmod !== null) {
    check(`${url}: lastmod "${e.lastmod}" is not YYYY-MM-DD`, /^\d{4}-\d{2}-\d{2}$/.test(e.lastmod));
    check(`${url}: lastmod ${e.lastmod} is in the future`, e.lastmod <= today, `today is ${today}`);
  }
}

for (const url of built) {
  if (NOT_INDEXED.has(url)) continue;
  check(`${url} is built but missing from the sitemap`, sitemapUrls.has(url));
}

// ---------------------------------------------------------------------------
// lastmod against the source front matter.
// ---------------------------------------------------------------------------

const updatedOf = new Map();
for (const md of walk(CONTENT, '.md')) {
  const updated = fs.readFileSync(md, 'utf8').match(/^updated:\s*(\S+)\s*$/m)?.[1];
  if (updated) updatedOf.set(urlOfMarkdown(md), updated);
}

let compared = 0;
for (const e of entries) {
  const url = e.loc.slice(ORIGIN.length) || '/';
  const front = updatedOf.get(url);
  if (front === undefined) {
    // Section indexes, the homepage and /sitemap-page/ are generated listings
    // with no source file and therefore no updated: date. They must not carry
    // a lastmod either, or it would be invented.
    check(`${url} has a lastmod but no source updated: date`, e.lastmod === null, `lastmod ${e.lastmod}`);
    continue;
  }
  compared++;
  check(
    `${url}: sitemap lastmod ${e.lastmod} does not match updated: ${front}`,
    e.lastmod === front
  );
}

// ---------------------------------------------------------------------------
// robots.txt must not contradict the sitemap.
// ---------------------------------------------------------------------------

const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
check('robots.txt does not name the sitemap', robots.includes(`${ORIGIN}/sitemap.xml`));

const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)\s*$/gm)].map((m) => m[1]);
for (const rule of disallowed) {
  if (rule === '/') {
    check('robots.txt disallows the whole site', false);
    continue;
  }
  for (const url of sitemapUrls) {
    check(
      `robots.txt disallows ${rule} but the sitemap lists ${url}`,
      !url.startsWith(rule),
      'a crawler is told both to fetch it and not to'
    );
  }
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

const feed = fs.readFileSync(path.join(DIST, 'feed.xml'), 'utf8');
check('feed.xml is not an RSS 2.0 document', /<rss[^>]+version="2\.0"/.test(feed));
check(
  'feed.xml has no correct atom:link self reference',
  feed.includes(`href="${ORIGIN}/feed.xml"`) && feed.includes('rel="self"')
);
check(`feed.xml channel link is not ${ORIGIN}/`, feed.includes(`<link>${ORIGIN}/</link>`));

const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
  title: m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '',
  link: m[1].match(/<link>([^<]+)<\/link>/)?.[1] ?? '',
  guid: m[1].match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1] ?? '',
  pub: m[1].match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? '',
}));

check('feed.xml has no items', items.length > 0);
const now = Date.now();
for (const it of items) {
  const label = it.link || it.title || 'an item';
  check(`feed item ${label} has no title`, it.title.trim().length > 0);
  check(`feed item ${label} has no link`, it.link.startsWith(`${ORIGIN}/`));
  check(`feed item ${label}: guid does not match its link`, it.guid === it.link);
  check(`feed item ${label}: pubDate "${it.pub}" does not parse`, !Number.isNaN(Date.parse(it.pub)));
  check(`feed item ${label}: pubDate is in the future`, Date.parse(it.pub) <= now);
  const url = it.link.slice(ORIGIN.length);
  check(`feed item points at ${url}, which is not in dist/`, built.has(url));
  check(`feed item points at ${url}, which is not in the sitemap`, sitemapUrls.has(url));
}

// ---------------------------------------------------------------------------
// Each page's canonical must be the URL the sitemap uses for it, trailing
// slash included. A mismatch splits a page's signals between two addresses.
// ---------------------------------------------------------------------------

for (const file of walk(DIST, '.html')) {
  const url = urlOfHtml(file);
  if (NOT_INDEXED.has(url)) continue;
  const canonical = fs.readFileSync(file, 'utf8').match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  check(`${url} has no canonical link`, !!canonical);
  if (canonical) check(`${url}: canonical is ${canonical}`, canonical === `${ORIGIN}${url}`);
}

console.log(
  `\n  ${entries.length} sitemap entr(ies) · ${compared} lastmod compared to front matter · ${items.length} feed item(s) · ${disallowed.length} robots Disallow rule(s)`
);
console.log(failures ? `\n${failures} failure(s).` : '\n✓ All sitemap, feed and robots assertions passed.');
process.exit(failures ? 1 : 0);
