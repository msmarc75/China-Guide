#!/usr/bin/env node
// Every URL this site has ever published, and whether it still resolves.
//
// WHY THIS EXISTS
//
// `src/check.mjs` catches internal links pointing at pages that do not exist
// TODAY, so the live corpus is sound by construction. What nothing checked is
// HISTORY. A URL that existed at some point and no longer does is invisible to
// every tool here — but not to the outside world, which may still link to it,
// have it bookmarked, or hold it in a search index. After eighty-odd merged
// pull requests that is worth knowing rather than assuming.
//
// HOW IT RECONSTRUCTS THE PAST
//
// `git log --diff-filter=A|D|R --name-only` over `src/content` gives every
// markdown file ever added, deleted or renamed. Each historic path is mapped
// to the URL it would have produced using the build's own rule: files under
// `src/content/pages/` map to ROOT, everything else to `/<section>/<slug>/`.
// That special case is not decorative — getting it wrong once made a probe
// report five perfectly good sitemap entries as broken.
//
// WHY THE SQUASH HISTORY IS ENOUGH
//
// Every pull request here is squash-merged, so a page created and renamed
// inside one branch leaves no trace on main. That sounds like a gap and is
// not, because of how the site deploys: Cloudflare Pages builds the
// production site from `main`. A state that never reached main was never
// served on the canonical domain, so it never reached anyone. Main's commit
// sequence is therefore the complete record of what was ever publicly live,
// and that is exactly what this reads.
//
// (Branch previews do get built, on *.pages.dev subdomains. They are not the
// canonical origin and nothing links to them, so they are out of scope.)
//
// WHAT IT CANNOT SEE
//
// URLs that never existed as a markdown file — a route emitted directly by
// `build.mjs`, such as `/search/` or `/sitemap-page/`, would have to be
// changed in the generator rather than by moving a file. Those are listed
// below as known generated routes and checked separately, but a route added
// and removed entirely inside the generator would escape.
//
// And it cannot know what the outside world actually links to. A dead URL
// with no internal references may still be someone's bookmark. That judgement
// needs referrer data, which a static build does not have.
//
// It asserts nothing and is not in `npm test`. Whether a dead URL deserves a
// redirect depends on whether anyone ever reached it, which is an editorial
// and analytical call rather than a rule.
//
// Usage: node tools/audit-legacy-urls.mjs

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const CONTENT = 'src/content';
const DIST = 'dist';

const git = (args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

/** The build's rule: pages/ maps to root, everything else to /section/slug/. */
const urlOfPath = (p) => {
  const rel = p.replace(/^src\/content\//, '').replace(/\.md$/, '');
  return rel.startsWith('pages/') ? `/${rel.slice('pages/'.length)}/` : `/${rel}/`;
};

const pathsFor = (filter) => {
  const out = git([
    'log',
    '--all',
    '-M',
    `--diff-filter=${filter}`,
    '--name-only',
    '--pretty=format:',
    '--',
    CONTENT,
  ]);
  return [...new Set(out.split('\n').map((l) => l.trim()).filter((l) => l.endsWith('.md')))];
};

const added = pathsFor('A');
const deleted = pathsFor('D');
const renamedRaw = git([
  'log',
  '--all',
  '-M',
  '--diff-filter=R',
  '--name-status',
  '--pretty=format:',
  '--',
  CONTENT,
])
  .split('\n')
  .filter((l) => /^R\d*\t/.test(l));

// Routes the generator emits directly, which have no markdown file behind them.
const GENERATED_ROUTES = ['/', '/search/', '/sitemap-page/', '/404.html'];

const everPublished = new Set([...added, ...deleted].map(urlOfPath));
for (const r of GENERATED_ROUTES) everPublished.add(r);
// Section indexes come from directory names, which exist as long as any file
// in them does.
for (const p of [...added, ...deleted]) {
  const section = p.replace(/^src\/content\//, '').split('/')[0];
  if (section !== 'pages' && section.endsWith('.mjs') === false) everPublished.add(`/${section}/`);
}

// ---------------------------------------------------------------------------
// What resolves today.
// ---------------------------------------------------------------------------

const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const origin = sitemap.match(/<loc>(https:\/\/[^/]+)\//)?.[1] ?? '';
const liveUrls = new Set(
  [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(origin.length) || '/')
);
for (const r of GENERATED_ROUTES) if (fs.existsSync(path.join(DIST, r.replace(/^\//, ''), 'index.html')) || r === '/404.html') liveUrls.add(r);

const dead = [...everPublished].filter((u) => !liveUrls.has(u)).sort();

console.log('\nLegacy URLs');
console.log(`  markdown files ever added     ${added.length}`);
console.log(`  markdown files ever deleted   ${deleted.length}`);
console.log(`  renames git detected          ${renamedRaw.length}`);
console.log(`  distinct URLs ever published  ${everPublished.size}`);
console.log(`  URLs live today               ${liveUrls.size}`);
console.log(`  dead URLs                     ${dead.length}\n`);

if (renamedRaw.length) {
  console.log('Renames:');
  for (const r of renamedRaw) console.log(`  ${r}`);
  console.log();
}

if (!dead.length) {
  console.log('  Nothing the site ever published has stopped resolving.');
  console.log('  A redirects file would have nothing to redirect.\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// For each dead URL: does anything still point at it?
// ---------------------------------------------------------------------------

const walk = (dir, ext, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
};
const sources = walk(CONTENT, '.md').map((f) => ({ f, text: fs.readFileSync(f, 'utf8') }));
const feed = fs.readFileSync(path.join(DIST, 'feed.xml'), 'utf8');
const searchIndex = fs.readFileSync(path.join(DIST, 'search-index.json'), 'utf8');

console.log('Dead URLs and what still references them:\n');
for (const url of dead) {
  const inProse = sources.filter((s) => s.text.includes(`](${url})`)).map((s) => s.f);
  const inRelated = sources.filter((s) => new RegExp(`^\\s+- ${url}\\s*$`, 'm').test(s.text)).map((s) => s.f);
  console.log(`  ${url}`);
  console.log(`      prose links      ${inProse.length ? inProse.join(', ') : 'none'}`);
  console.log(`      related: entries ${inRelated.length ? inRelated.join(', ') : 'none'}`);
  console.log(`      in sitemap       ${sitemap.includes(`${origin}${url}<`) ? 'YES' : 'no'}`);
  console.log(`      in feed          ${feed.includes(`${origin}${url}<`) ? 'YES' : 'no'}`);
  console.log(`      in search index  ${searchIndex.includes(`"u":"${url}"`) ? 'YES' : 'no'}`);
  console.log();
}
