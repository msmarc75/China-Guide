#!/usr/bin/env node
// Reports how many EDITORIAL inbound links each page has, weakest first.
//
// Why this exists: the discoverability audit asserts that every article has at
// least one inbound editorial link, which is a floor, not a target. Measuring
// the distribution showed 53 pages sitting exactly on that floor — almost all
// of them answer pages, which are the ones built to rank for a specific
// question and therefore the ones that most need internal support. A page with
// one inbound link is nearly orphaned in the site's own graph.
//
// "Editorial" means a link a writer put in running prose. Links in the related
// block, the sidebar and the ad chrome are excluded, because they are generated
// and say nothing about whether a human thought two pages belonged together.
// The extraction matches tools/audit-discoverability.mjs deliberately: two
// tools disagreeing about what counts as a link would be worse than neither.
//
// Asserts nothing. The right number of inbound links is an editorial judgement,
// not a threshold — a rushed pass to hit a number produces link stuffing, which
// is worse than the problem.
//
// Usage: node tools/audit-inbound-links.mjs [--max N] [--section answers]

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

// Section indexes and legal pages are linked from the nav and footer, not from
// prose. Counting them as under-linked would be noise.
const NOT_EDITORIAL_TARGETS =
  /^\/(about|contact|privacy|editorial-policy|affiliate-disclosure|search|sitemap-page|shop)?\/?$/;

function editorialRegion(html) {
  const start = html.indexOf('<article');
  if (start === -1) return '';
  const relatedAt = html.indexOf('<section class="related">', start);
  const end = relatedAt !== -1 ? relatedAt : html.indexOf('</article>', start);
  return html
    .slice(start, end === -1 ? html.length : end)
    // Strip chrome asides only. `:::warn`/`:::tip`/`:::note` render as
    // <aside class="callout ...> and are prose a writer chose to put there, so
    // links inside them are editorial and must count. The sidebar, product and
    // promo slots are generated and must not.
    .replace(/<aside class="(?:article__aside|product-slot|promo-slot)[\s\S]*?<\/aside>/g, '')
    .replace(/<div class="ad-slot"[\s\S]*?<\/div>/g, '');
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

const argv = process.argv;
const maxShown = argv.includes('--max') ? Number(argv[argv.indexOf('--max') + 1]) : 2;
const section = argv.includes('--section') ? argv[argv.indexOf('--section') + 1] : null;

const files = walk(DIST).filter((f) => !/404\.html|\/search\/|sitemap-page/.test(f));
const slugOf = (f) => `/${relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/')}`;

const slugs = files.map(slugOf);
const counts = new Map(slugs.map((s) => [s, 0]));
const sources = new Map(slugs.map((s) => [s, []]));

for (const file of files) {
  const from = slugOf(file);
  const region = editorialRegion(readFileSync(file, 'utf8'));
  for (const to of slugs) {
    if (to === from) continue;
    if (region.includes(`href="${to}"`)) {
      counts.set(to, counts.get(to) + 1);
      sources.get(to).push(from);
    }
  }
}

const scored = [...counts.entries()]
  .filter(([slug]) => !NOT_EDITORIAL_TARGETS.test(slug))
  .filter(([slug]) => !/^\/(answers|destinations|culture|food|guides|plan|itineraries|tools)\/$/.test(slug))
  .filter(([slug]) => (section ? slug.startsWith(`/${section}/`) : true))
  .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));

const values = scored.map(([, c]) => c).sort((a, b) => a - b);
const median = values.length ? values[Math.floor(values.length / 2)] : 0;

console.log(`\nInbound editorial links${section ? ` — /${section}/` : ''}`);
console.log(`  pages            ${scored.length}`);
console.log(`  min · median · max   ${values[0]} · ${median} · ${values[values.length - 1]}`);
console.log(`  at or below ${maxShown}    ${scored.filter(([, c]) => c <= maxShown).length}\n`);

for (const [slug, count] of scored.filter(([, c]) => c <= maxShown)) {
  console.log(`  ${String(count).padStart(2)}  ${slug}`);
  if (count > 0) console.log(`      from: ${sources.get(slug).join(', ')}`);
}
console.log();

// ---------------------------------------------------------------------------
// Cluster isolation — the thing the totals above hide.
//
// /destinations/beijing/restaurants/ sat at two inbound editorial links, which
// is on the section's median and looks entirely healthy. Both came from
// /destinations/beijing/ and /destinations/beijing/things-to-do/ — its own
// parent and its own sibling. A reader who never lands on the Beijing city
// page has no editorial route to it at all.
//
// Eight sub-pages were in that state and the count-based view could not show
// it, because a link's VALUE depends on where it comes from and a total throws
// that away. So: for any page nested under a parent (/destinations/<city>/…),
// count how many of its referrers come from outside that cluster.
// ---------------------------------------------------------------------------

const clusterOf = (slug) => {
  const m = slug.match(/^\/([^/]+)\/([^/]+)\/.+/);
  return m ? `/${m[1]}/${m[2]}/` : null;
};

const nested = scored
  .map(([slug, count]) => {
    const c = clusterOf(slug);
    if (!c) return null;
    const outside = sources.get(slug).filter((s) => clusterOf(s) !== c && s !== c);
    return { slug, count, outside };
  })
  .filter(Boolean)
  .sort((a, b) => a.outside.length - b.outside.length || a.count - b.count);

if (nested.length) {
  const isolated = nested.filter((n) => n.outside.length === 0);
  console.log(`Cluster isolation${section ? ` — /${section}/` : ''}`);
  console.log(`  nested pages     ${nested.length}`);
  console.log(`  reachable only from inside their own cluster    ${isolated.length}\n`);
  for (const n of nested.filter((x) => x.outside.length <= 1)) {
    const label = n.outside.length === 0 ? 'ISOLATED' : `${n.outside.length} outside`;
    console.log(`  ${String(n.count).padStart(2)} in · ${label.padEnd(10)} ${n.slug}`);
    if (n.outside.length) console.log(`      outside: ${n.outside.join(', ')}`);
  }
  console.log();
}
