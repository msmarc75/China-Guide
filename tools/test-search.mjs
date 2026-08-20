#!/usr/bin/env node
/**
 * The two client-side features — search and the visa checker — must actually
 * be able to do what the pages say they do.
 *
 * WHY THIS EXISTS
 *
 * `dist/search-index.json` is regenerated on every build and `src/check.mjs`
 * asserted exactly one thing about it: that the file exists. An index that
 * silently dropped half the corpus, or pointed at URLs that no longer built,
 * or lost the one field the client dereferences without a guard, would pass
 * every check the project had. The site would look fine and search would be
 * quietly broken — the same invisible failure mode the structured data had
 * before `test-schema.mjs`.
 *
 * THE FIELD THAT MATTERS MOST
 *
 * `dist/assets/main.js` scores each document like this:
 *
 *     var title = doc.t.toLowerCase();
 *     var desc  = (doc.d || '').toLowerCase();
 *     var blob  = doc.k || '';
 *
 * `d`, `k` and `s` are guarded. **`t` is not.** One entry without a `t` throws
 * a TypeError inside the `.map()` that scores every document, which kills the
 * whole result set for every query on every page — not just that one entry.
 * A single missing title is a total outage of the feature, so that assertion
 * carries more weight than the rest of the file put together.
 *
 * WHY THE VISA CHECKER IS IN HERE TOO
 *
 * It is the site's other client-side feature and it had the same class of
 * problem: prose describing the tool with nothing connecting the description
 * to the tool. Three pages described a five-field form as "one click" (twice)
 * and "four questions" (once). That is the exchange-rate defect again — a
 * figure asserted in prose, never derived from the thing it describes.
 *
 * The functional tests for the checker live in `test-visa-checker.mjs`, which
 * needs Playwright and a running server and therefore cannot be in `npm test`.
 * This assertion needs neither, so it runs here where it will actually fire.
 *
 * WHAT THIS DOES NOT CHECK
 *
 * It does not run the client JavaScript, does not evaluate ranking quality,
 * and cannot tell you whether a search for "visa" returns useful results —
 * relevance is a judgement, not an assertion. It checks that the data the
 * client depends on is complete, well-formed and points somewhere real.
 *
 * Run: npm run test:search
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const CONTENT = 'src/content';
const INDEX = path.join(DIST, 'search-index.json');

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) return;
  failures++;
  console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
};

const walk = (dir, out = [], ext = '.html') => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out, ext);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
};

const urlOf = (file) => {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  return rel === 'index.html' ? '/' : `/${rel.replace(/index\.html$/, '')}`;
};

console.log('Search index and client features');

// ---------------------------------------------------------------------------
// The index parses and is an array.
// ---------------------------------------------------------------------------

let docs = null;
try {
  docs = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
} catch (err) {
  check('search-index.json does not parse', false, err.message);
}

if (Array.isArray(docs)) {
  // -------------------------------------------------------------------------
  // Every field the client reads is present and non-empty.
  //
  // `t` is the unguarded one. The others are guarded in main.js, but an empty
  // description or section label is a degraded result rather than a correct
  // one, so they are asserted too.
  // -------------------------------------------------------------------------

  const FIELDS = ['t', 'u', 'd', 's', 'k'];
  docs.forEach((doc, i) => {
    for (const f of FIELDS) {
      check(
        `entry ${i} (${doc?.u ?? 'no url'}) has an empty or missing "${f}"`,
        typeof doc?.[f] === 'string' && doc[f].trim().length > 0,
        f === 't' ? 'main.js calls doc.t.toLowerCase() unguarded — this breaks search for every query' : ''
      );
    }
  });

  // -------------------------------------------------------------------------
  // Every entry points at a page that was actually built, and no page appears
  // twice. A duplicate is a double result for one page; a dead url is a click
  // into a 404 from a feature that is supposed to be the site's own map.
  // -------------------------------------------------------------------------

  const built = new Set(walk(DIST).map(urlOf));
  const seen = new Map();
  for (const doc of docs) {
    if (typeof doc?.u !== 'string') continue;
    check(`index points at ${doc.u}, which is not in dist/`, built.has(doc.u));
    seen.set(doc.u, (seen.get(doc.u) ?? 0) + 1);
  }
  for (const [url, n] of seen) {
    check(`${url} appears ${n} times in the index`, n === 1);
  }

  // -------------------------------------------------------------------------
  // Nothing is silently missing.
  //
  // The index is built from allArticles + standalonePages, so section indexes,
  // the homepage, 404, /search/ and /sitemap-page/ are excluded by design —
  // they are listings and chrome, not content. Everything else must be in it.
  //
  // This is the assertion that catches truncation. A count alone would not:
  // "186 entries" looks healthy whatever the corpus has grown to. Comparing
  // against the built pages is what makes it mean something.
  // -------------------------------------------------------------------------

  // A section index is a top-level url naming a CONTENT DIRECTORY. It cannot
  // be recognised by url shape alone, and the first version of this tried:
  // /about/, /privacy/, /contact/, /editorial-policy/ and /affiliate-disclosure/
  // are the five standalone pages, they are real content, they are correctly
  // indexed — and a `/^\/[^/]+\/$/` test called every one of them a listing.
  // Five false failures on a corpus that was clean. Read the directories.
  const sections = new Set(
    fs
      .readdirSync(CONTENT, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => `/${e.name}/`)
  );
  const isSectionIndex = (url) => sections.has(url);
  const EXCLUDED = new Set(['/', '/404.html', '/search/', '/sitemap-page/']);
  const indexed = new Set(docs.map((d) => d?.u));

  for (const url of built) {
    if (EXCLUDED.has(url) || isSectionIndex(url)) continue;
    check(`${url} is built but missing from the search index`, indexed.has(url));
  }
  for (const url of indexed) {
    if (!url) continue;
    check(
      `${url} is in the search index but is a listing page`,
      !EXCLUDED.has(url) && !isSectionIndex(url)
    );
  }

  console.log(
    `\n  ${docs.length} indexed · ${built.size} built · ${(fs.statSync(INDEX).size / 1024).toFixed(0)}KB`
  );
}

// ---------------------------------------------------------------------------
// The visa checker's prose must match the form it describes.
// ---------------------------------------------------------------------------

const TEMPLATE = fs.readFileSync('src/lib/templates.mjs', 'utf8');
const form = TEMPLATE.slice(
  TEMPLATE.indexOf('id="visa-form"'),
  TEMPLATE.indexOf('id="visa-result"')
);
const inputs = [...form.matchAll(/<(?:select|input)[^>]+id="visa-([a-z]+)"/g)].map((m) => m[1]);
const FIELD_COUNT = inputs.length;

check(
  'could not find the visa checker form in templates.mjs',
  FIELD_COUNT > 0,
  'the id="visa-form" .. id="visa-result" slice found no inputs — the markup moved'
);

// Every input needs its own <label for="...">. The tool is the one place on
// the site a reader types something, so an unlabelled field is the site's
// worst accessibility failure available.
for (const id of inputs) {
  check(
    `visa checker field #visa-${id} has no <label for>`,
    form.includes(`for="visa-${id}"`) || new RegExp(`<label[^>]*>\\s*<input[^>]+id="visa-${id}"`).test(form),
    'a select or input with no label is unusable with a screen reader'
  );
}

// Any prose that counts the fields must count them correctly. Words, because
// house style spells small numbers out.
const WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const expected = WORDS[FIELD_COUNT - 1];

for (const file of walk(CONTENT, [], '.md')) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = file.replace(`${CONTENT}/`, '');
  if (!/visa[- ]checker/i.test(text)) continue;

  for (const m of text.matchAll(/asks (\w+) questions?/gi)) {
    check(
      `${rel}: says the visa checker "asks ${m[1]} questions"`,
      m[1].toLowerCase() === expected,
      `the form has ${FIELD_COUNT} inputs (${inputs.join(', ')}) — say "${expected}"`
    );
  }
  for (const m of text.matchAll(/in one click|single click|one tap/gi)) {
    check(
      `${rel}: describes the visa checker as "${m[0]}"`,
      false,
      `the form has ${FIELD_COUNT} inputs (${inputs.join(', ')}) before it answers anything`
    );
  }
}

console.log(`  visa checker: ${FIELD_COUNT} labelled input(s) — ${inputs.join(', ')}`);
console.log(failures ? `\n${failures} failure(s).` : '\n✓ All search and client-feature assertions passed.');
process.exit(failures ? 1 : 0);
