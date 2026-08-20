#!/usr/bin/env node
/**
 * Every page's schema.org JSON-LD must parse, carry its required properties,
 * and be the schema that page is supposed to emit.
 *
 * WHY THIS EXISTS
 *
 * 199 built pages emit structured data — Organization and WebSite everywhere,
 * BreadcrumbList on all but the homepage, Article on every article, QAPage on
 * the 95 answer pages, FAQPage on the 68 pages with an FAQ block,
 * TouristDestination on the 44 destination pages. Until this test, nothing
 * asserted a single byte of it.
 *
 * That matters because the failure mode is silent in a way most defects are
 * not. A trailing comma in a template, a renamed front-matter field, an
 * `acceptedAnswer` that stops being emitted — the build passes, the page
 * renders identically, a reader notices nothing, and the rich result quietly
 * stops appearing. The only signal is a ranking change weeks later, by which
 * time the cause is many commits back.
 *
 * It is the same shape as the two defects the freshness passes found: a thing
 * produced by hand with nothing connecting it to a check. Those got tests
 * (`test-visa-checker.mjs`, `test-currency.mjs`). So does this.
 *
 * THE INVARIANT WORTH THE MOST
 *
 * No page may carry BOTH QAPage and FAQPage. That is a standing editorial
 * rule — Google treats them as competing page-level types and a page claiming
 * both is a page claiming to be two things.
 *
 * The corpus satisfies it today, but only by accident of what has been
 * written. `renderArticle` emits `faqSchema` whenever the markdown contains an
 * FAQ block AND `qaPageSchema` whenever the page is in /answers/, with no
 * guard between them. One answer page with a "## Frequently asked questions"
 * heading would emit both, and nothing would say so. This test is that guard.
 *
 * WHAT IT DOES NOT CHECK
 *
 * It is not a schema.org validator. It does not know the full vocabulary, does
 * not check that property values are of the right schema type, and cannot tell
 * you whether Google will actually grant a rich result — that needs Google's
 * own test against a live URL. It checks the things that can silently break
 * here: that the JSON parses, that the required properties are present and
 * non-empty, and that each page emits the schema its section says it should.
 *
 * TWO DELIBERATE EXEMPTIONS, both verified as correct rather than assumed:
 *   dist/404.html emits no JSON-LD at all — an error page has nothing to
 *   describe.
 *   dist/index.html emits no BreadcrumbList — it is the breadcrumb root.
 *
 * Run: npm run test:schema
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const CONTENT = 'src/content';

const walk = (dir, out = [], ext) => {
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

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) return;
  failures++;
  console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
};

const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

console.log('Structured data');

// ---------------------------------------------------------------------------
// What the source says each page should emit.
// ---------------------------------------------------------------------------

const FAQ_HEADING = /^## Frequently asked questions\s*$/m;
const expectFaq = new Set();
for (const md of walk(CONTENT, [], '.md')) {
  if (!FAQ_HEADING.test(fs.readFileSync(md, 'utf8'))) continue;
  const rel = path.relative(CONTENT, md).replace(/\\/g, '/').replace(/\.md$/, '');
  expectFaq.add(`/${rel}/`);
}

// ---------------------------------------------------------------------------
// Parse everything.
// ---------------------------------------------------------------------------

const files = walk(DIST, [], '.html');
const byUrl = new Map();
let blocks = 0;
let nodes = 0;

for (const file of files) {
  const url = urlOf(file);
  const html = fs.readFileSync(file, 'utf8');
  const found = [];

  for (const m of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  )) {
    blocks++;
    let doc;
    try {
      doc = JSON.parse(m[1]);
    } catch (err) {
      check(`${url}: JSON-LD does not parse`, false, `${err.message}  ·  ${file}`);
      continue;
    }

    check(
      `${url}: block has no @context`,
      doc['@context'] === 'https://schema.org',
      `got ${JSON.stringify(doc['@context'])} — schema.org expected on the top-level document`
    );

    const graph = Array.isArray(doc['@graph']) ? doc['@graph'] : [doc];
    for (const node of graph) {
      nodes++;
      found.push(node);
    }
  }
  byUrl.set(url, found);
}

// ---------------------------------------------------------------------------
// @type on every node, including nested ones.
//
// A nested object without @type is the common way structured data degrades:
// the parent still validates, and the child is thrown away.
// ---------------------------------------------------------------------------

const typeless = (node, trail, url) => {
  if (Array.isArray(node)) {
    node.forEach((v, i) => typeless(v, `${trail}[${i}]`, url));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const keys = Object.keys(node);
  // A bare {"@id": "..."} is a reference to a node defined elsewhere in the
  // graph, which is valid JSON-LD and needs no @type of its own.
  const isReference = keys.length === 1 && keys[0] === '@id';
  check(`${url}: ${trail} has no @type`, isReference || nonEmpty(node['@type']));
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('@')) continue;
    if (v && typeof v === 'object') typeless(v, `${trail}.${k}`, url);
  }
};

for (const [url, found] of byUrl) {
  found.forEach((n, i) => typeless(n, `${n['@type'] ?? `node ${i}`}`, url));
}

// ---------------------------------------------------------------------------
// Type-specific required properties.
// ---------------------------------------------------------------------------

for (const [url, found] of byUrl) {
  for (const node of found) {
    const t = node['@type'];
    const at = `${url}: ${t}`;

    if (t === 'QAPage') {
      const q = node.mainEntity;
      check(`${at} has no mainEntity`, !!q && !Array.isArray(q));
      if (!q || Array.isArray(q)) continue;
      check(`${at} mainEntity has no name`, nonEmpty(q.name));
      check(`${at} mainEntity has no acceptedAnswer`, !!q.acceptedAnswer);
      check(
        `${at} acceptedAnswer has no text`,
        !!q.acceptedAnswer && nonEmpty(q.acceptedAnswer.text)
      );
    }

    if (t === 'FAQPage') {
      const list = node.mainEntity;
      check(`${at} mainEntity is not a non-empty array`, Array.isArray(list) && list.length > 0);
      if (!Array.isArray(list)) continue;
      list.forEach((q, i) => {
        check(`${at} mainEntity[${i}] has no name`, nonEmpty(q?.name));
        check(
          `${at} mainEntity[${i}] acceptedAnswer has no text`,
          nonEmpty(q?.acceptedAnswer?.text)
        );
      });
    }

    if (t === 'Article') {
      check(`${at} has no headline`, nonEmpty(node.headline));
      check(
        `${at} has neither datePublished nor dateModified`,
        nonEmpty(node.datePublished) || nonEmpty(node.dateModified)
      );
      check(`${at} has no author`, !!node.author);
    }

    if (t === 'BreadcrumbList') {
      const items = node.itemListElement;
      check(`${at} itemListElement is not a non-empty array`, Array.isArray(items) && items.length > 0);
      if (!Array.isArray(items)) continue;
      items.forEach((it, i) => {
        check(`${at} itemListElement[${i}] has no position`, Number.isInteger(it?.position));
        check(`${at} itemListElement[${i}] has no name`, nonEmpty(it?.name));
      });
      // Positions must run 1..n in order, or the trail renders wrong.
      const positions = items.map((it) => it?.position).join(',');
      const expected = items.map((_, i) => i + 1).join(',');
      check(`${at} positions are not 1..${items.length}`, positions === expected, `got ${positions}`);
    }

    if (t === 'TouristDestination') {
      check(`${at} has no name`, nonEmpty(node.name));
      check(`${at} has no description`, nonEmpty(node.description));
    }
  }
}

// ---------------------------------------------------------------------------
// The page-level invariants: what each page must and must not emit.
// ---------------------------------------------------------------------------

const NO_SCHEMA = new Set(['/404.html']);
const NO_BREADCRUMB = new Set(['/']);

for (const [url, found] of byUrl) {
  const types = new Set(found.map((n) => n['@type']));

  if (NO_SCHEMA.has(url)) {
    check(`${url} should carry no JSON-LD`, found.length === 0, `found ${[...types].join(', ')}`);
    continue;
  }

  check(`${url} emits no JSON-LD at all`, found.length > 0);
  if (!found.length) continue;

  check(`${url} has no Organization node`, types.has('Organization'));
  check(`${url} has no WebSite node`, types.has('WebSite'));

  if (!NO_BREADCRUMB.has(url)) {
    check(`${url} has no BreadcrumbList`, types.has('BreadcrumbList'));
  }

  // The one that matters most.
  check(
    `${url} carries BOTH QAPage and FAQPage`,
    !(types.has('QAPage') && types.has('FAQPage')),
    'Google treats them as competing page types; a page may claim only one'
  );

  // Section rules, in both directions — a page that stopped emitting its
  // schema is exactly what a parse check alone would miss.
  const isAnswer = url.startsWith('/answers/') && url !== '/answers/';
  check(`${url} is an answer page but emits no QAPage`, !isAnswer || types.has('QAPage'));
  check(`${url} emits QAPage but is not an answer page`, !types.has('QAPage') || isAnswer);

  const shouldFaq = expectFaq.has(url);
  check(
    `${url} has an FAQ block in source but emits no FAQPage`,
    !shouldFaq || types.has('FAQPage')
  );
  check(
    `${url} emits FAQPage but has no FAQ block in source`,
    !types.has('FAQPage') || shouldFaq
  );
}

console.log(
  `\n  ${files.length} page(s) · ${blocks} JSON-LD block(s) · ${nodes} node(s) · ${expectFaq.size} FAQ block(s) in source`
);
console.log(failures ? `\n${failures} failure(s).` : '\n✓ All structured-data assertions passed.');
process.exit(failures ? 1 : 0);
