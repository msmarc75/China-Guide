#!/usr/bin/env node
/**
 * Post-build quality gate: broken internal links, missing or oversized SEO
 * metadata, duplicate titles/descriptions, and heading structure.
 *
 * Exits non-zero when a hard error is found so CI can block a bad deploy.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const errors = [];
const warnings = [];

const urlOf = (file) => {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404.html';
  return `/${rel.replace(/index\.html$/, '')}`;
};

const knownUrls = new Set(htmlFiles.map(urlOf));
const knownFiles = new Set(files.map((f) => `/${path.relative(DIST, f).replace(/\\/g, '/')}`));

const titles = new Map();
const descriptions = new Map();
const inbound = new Map();

/** Character counts must reflect what a search engine renders, not the escaped source. */
const decode = (s = '') =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

for (const file of htmlFiles) {
  const url = urlOf(file);
  const html = fs.readFileSync(file, 'utf8');

  const title = decode(/<title>([\s\S]*?)<\/title>/.exec(html)?.[1]?.trim());
  const desc = decode(/<meta name="description" content="([^"]*)"/.exec(html)?.[1]?.trim());
  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
  const h1s = html.match(/<h1[\s>]/g) || [];

  if (!title) errors.push(`${url} — missing <title>`);
  if (!desc) errors.push(`${url} — missing meta description`);
  if (!canonical) errors.push(`${url} — missing canonical`);
  if (h1s.length !== 1) errors.push(`${url} — expected exactly 1 <h1>, found ${h1s.length}`);

  // Indexable pages only — noindex utility pages have no SERP snippet to size.
  const indexable = !/name="robots" content="noindex/.test(html);
  if (indexable && title.length > 65) {
    warnings.push(`${url} — title is ${title.length} chars (>65 may truncate in SERPs)`);
  }
  if (indexable && desc && (desc.length < 70 || desc.length > 165)) {
    warnings.push(`${url} — meta description is ${desc.length} chars (aim for 120–160)`);
  }

  if (title) {
    if (titles.has(title)) warnings.push(`Duplicate title: "${title}" on ${url} and ${titles.get(title)}`);
    else titles.set(title, url);
  }
  if (desc) {
    if (descriptions.has(desc)) warnings.push(`Duplicate description on ${url} and ${descriptions.get(desc)}`);
    else descriptions.set(desc, url);
  }

  // Editorial inbound links only.
  //
  // Two exclusions matter. The header, breadcrumbs and footer sit outside
  // <main> and appear on every page. And section indexes list every page they
  // contain automatically — counting those would mean no article could ever be
  // an orphan, which makes the check worthless. What we want to know is whether
  // any page's prose or related block actually points here.
  const isAutomaticListing = url === '/' || url === '/sitemap-page/' || /^\/[^/]+\/$/.test(url);
  if (!isAutomaticListing) {
    const main = /<main id="main">([\s\S]*)<\/main>/.exec(html)?.[1] || '';
    for (const m of main.matchAll(/href="(\/[^"#?]*)"/g)) {
      if (m[1] !== url) inbound.set(m[1], (inbound.get(m[1]) || 0) + 1);
    }
  }

  const links = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  for (const link of new Set(links)) {
    if (link.startsWith('//')) continue;
    if (knownUrls.has(link) || knownFiles.has(link)) continue;
    if (knownFiles.has(link.replace(/\?.*$/, ''))) continue;
    errors.push(`${url} — broken internal link: ${link}`);
  }

  // Structured data must parse
  const schemaTypes = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const parsed = JSON.parse(m[1].replace(/\\u003c/g, '<'));
      for (const node of parsed['@graph'] || [parsed]) schemaTypes.push(node['@type']);
    } catch (e) {
      errors.push(`${url} — invalid JSON-LD: ${e.message}`);
    }
  }

  // Google treats a page claiming to be both a single Q&A and an FAQ list as
  // conflicting markup, and may drop the rich result entirely.
  if (schemaTypes.includes('QAPage') && schemaTypes.includes('FAQPage')) {
    errors.push(`${url} — emits both QAPage and FAQPage; an answer page must carry only one`);
  }
}

/**
 * A page nothing links to is a page search engines discover late and rank
 * poorly, and readers never reach. Section indexes and utility pages are
 * exempt: they are reached through the navigation, which lives outside <main>.
 */
const EXEMPT_FROM_ORPHAN_CHECK = new Set(['/', '/search/', '/sitemap-page/', '/404.html']);
for (const file of htmlFiles) {
  const url = urlOf(file);
  if (EXEMPT_FROM_ORPHAN_CHECK.has(url)) continue;
  const isSectionIndex = /^\/[^/]+\/$/.test(url);
  const html = fs.readFileSync(file, 'utf8');
  if (/name="robots" content="noindex/.test(html)) continue;
  if (!inbound.get(url)) {
    const message = `${url} — orphan: no editorial link points here`;
    if (isSectionIndex) warnings.push(message);
    else errors.push(message);
  }
}

for (const required of ['sitemap.xml', 'robots.txt', 'feed.xml', 'search-index.json', 'site.webmanifest']) {
  if (!fs.existsSync(path.join(DIST, required))) errors.push(`missing ${required}`);
}

// No preconnect to a host nothing on the page then loads.
//
// Every page carried `<link rel="preconnect" href="https://fonts.googleapis.com">`
// while the stylesheet used pure system font stacks and no page ever requested
// a Google font. That is a DNS lookup, a TCP connection and a TLS handshake
// per page load, to a third party, for nothing — and fonts.googleapis.com is
// blocked in mainland China, so on a China travel guide a large share of
// readers were paying for a connection that could only hang.
//
// A preconnect is a promise about a request that follows. If the request is
// gone the promise has to go with it, and nothing was checking.
// At most one analytics beacon per page.
//
// Cloudflare's docs are explicit: "only one JS snippet can be rendered and
// used per page". Enabling automatic injection in the dashboard AND setting
// CF_BEACON_TOKEN would produce two, and the second is not merely redundant —
// it is unsupported. This catches the overlap that a dashboard toggle and an
// environment variable can otherwise create silently, since only one of the
// two is visible in this repository.
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const url = `/${path.relative(DIST, file).replace(/\\/g, '/').replace(/index\.html$/, '')}`;
  const beacons = (html.match(/static\.cloudflareinsights\.com\/beacon\.min\.js/g) || []).length;
  if (beacons > 1) errors.push(`${url} — ${beacons} Cloudflare beacons; only one per page is supported`);
  if (beacons === 1 && !/<script type="module"[^>]+cloudflareinsights/.test(html)) {
    errors.push(`${url} — Cloudflare beacon is missing type="module", which the manual embed requires`);
  }
}

const HINT_TAG = /<link[^>]+rel="(?:preconnect|dns-prefetch)"[^>]*>/g;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const url = `/${path.relative(DIST, file).replace(/\\/g, '/').replace(/index\.html$/, '')}`;
  // The hint tags must come out before asking whether the host is used — a
  // preconnect's own href otherwise counts as the request it is promising,
  // so the check passes on exactly the input it exists to reject. The first
  // version of this had that bug and sabotage is what surfaced it.
  const rest = html.replace(HINT_TAG, '');
  for (const m of html.matchAll(/<link[^>]+rel="(?:preconnect|dns-prefetch)"[^>]+href="(https?:\/\/[^"]+)"/g)) {
    const host = new URL(m[1]).host;
    const used = new RegExp(`(?:src|href)="https?://${host.replace(/\./g, '\\.')}`).test(rest);
    if (!used) errors.push(`${url} — preconnect to ${host}, which the page never requests`);
  }
}

console.log(`Checked ${htmlFiles.length} pages.`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  process.exit(1);
}
console.log('\n✓ No errors.');
