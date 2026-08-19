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

for (const file of htmlFiles) {
  const url = urlOf(file);
  const html = fs.readFileSync(file, 'utf8');

  const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1]?.trim();
  const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1]?.trim();
  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
  const h1s = html.match(/<h1[\s>]/g) || [];

  if (!title) errors.push(`${url} — missing <title>`);
  if (!desc) errors.push(`${url} — missing meta description`);
  if (!canonical) errors.push(`${url} — missing canonical`);
  if (h1s.length !== 1) errors.push(`${url} — expected exactly 1 <h1>, found ${h1s.length}`);

  if (title && title.length > 65) warnings.push(`${url} — title is ${title.length} chars (>65 may truncate in SERPs)`);
  if (desc && (desc.length < 70 || desc.length > 165)) {
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

  // Internal links
  const links = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  for (const link of new Set(links)) {
    if (link.startsWith('//')) continue;
    if (knownUrls.has(link) || knownFiles.has(link)) continue;
    if (knownFiles.has(link.replace(/\?.*$/, ''))) continue;
    errors.push(`${url} — broken internal link: ${link}`);
  }

  // Structured data must parse
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1].replace(/\\u003c/g, '<'));
    } catch (e) {
      errors.push(`${url} — invalid JSON-LD: ${e.message}`);
    }
  }
}

for (const required of ['sitemap.xml', 'robots.txt', 'feed.xml', 'search-index.json', 'site.webmanifest']) {
  if (!fs.existsSync(path.join(DIST, required))) errors.push(`missing ${required}`);
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
