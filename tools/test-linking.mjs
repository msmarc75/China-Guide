#!/usr/bin/env node
/**
 * Asserts the internal link graph of the real site: relatedness is computed
 * rather than hand-maintained, and no page is left without inbound editorial
 * links as the site grows.
 *
 * The counting lives in tools/lib/inbound-links.mjs, which is shared with
 * audit-inbound-links.mjs and audit-discoverability.mjs. This file used to
 * carry its own copy, and that copy was wrong in three ways — see the module
 * header. The upshot was an assertion that read "at least 2 inbound editorial
 * links" while accepting two links from a single article, plus links from the
 * generated related block. One page passed on that basis for three batches.
 *
 * Run: npm run test:linking   (expects dist/ to be built)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inboundSources, clusterIsolation, isArticle, urlOf } from './lib/inbound-links.mjs';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const { files: htmlFiles, sources, urls } = inboundSources(DIST);
const countOf = (url) => (sources.get(url) ?? []).length;

// The two shop pages are deliberately not promoted from editorial prose:
// pushing Marc's own products inside the guides is a commercial decision that
// is his to make, not a linking oversight. They are the only pages exempt, and
// the exemption is written down here rather than hidden behind a loose count —
// which is exactly how it stayed invisible before.
//
// /shop/china-trip-planner/ has zero editorial inbound links and always did.
// The old count hid that by counting the related block, where the other shop
// page points at it via `related:` front matter. That is generated topic
// overlap, not an editorial route.
const COMMERCIAL_PAGES = new Set(['/shop/china-trip-planner/', '/shop/survival-mandarin-pack/']);

const articles = urls.filter(isArticle);
// Report across the asserted set, so a deliberately unlinked commercial page
// does not make the floor look like a defect.
const counts = articles.filter((u) => !COMMERCIAL_PAGES.has(u)).map(countOf);

let failures = 0;
const check = (label, condition, detail = '') => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  }
};

console.log('Internal link graph');

const orphans = articles.filter((u) => !COMMERCIAL_PAGES.has(u) && countOf(u) === 0);
check('no article is an orphan', orphans.length === 0, orphans.join(', '));

const thin = articles.filter((u) => !COMMERCIAL_PAGES.has(u) && countOf(u) < 2);
check(
  'every article has at least 2 DISTINCT source articles linking to it',
  thin.length === 0,
  thin.map((u) => `${u} (${countOf(u)})`).join(', ')
);

// A page linked only from its own parent and sibling is unreachable to anyone
// who never lands on that parent. A count cannot show this, because the value
// of a link depends on where it comes from.
const isolated = clusterIsolation(sources, urls).filter((n) => n.outside.length === 0);
check(
  'no nested page is reachable only from inside its own cluster',
  isolated.length === 0,
  isolated.map((n) => n.url).join(', ')
);

check(
  'every article renders a related block',
  htmlFiles
    .filter((f) => isArticle(urlOf(DIST, f)))
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
