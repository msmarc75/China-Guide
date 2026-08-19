#!/usr/bin/env node
// Finds SUBJECTS the corpus discusses everywhere and hosts nowhere.
//
// WHY THIS EXISTS
//
// `find-orphan-questions.mjs` asks "which question has no page". That is the
// right question for a corpus that is filling in its FAQ blocks, and it has
// now been worked out: 95 answer pages, and what is left in its uncovered
// list is the "Is X worth visiting / how many days in X" pattern, which is
// answered adequately on the destination page where it is asked.
//
// This tool asks the larger one: WHICH TOPIC HAS NO PAGE AT ALL. Those are
// invisible to the question audit, because a subject nobody wrote an FAQ
// heading about never enters its input.
//
// THE SIGNAL
//
// House style bolds named things — **Lingyin Temple**, **Dongpo pork**,
// **the Karez irrigation system**. So a bolded multi-word phrase is the
// corpus pointing at a subject it considers nameable. Cross that against
// what each page CLAIMS to be about — its title, its navTitle, its
// `keywords` front matter — and three states fall out:
//
//   OWNED     some page's title or keywords name it. Fine.
//   LOCAL     one page mentions it. Usually just a detail of that page.
//   ORPHANED  three or more separate pages mention it, no page owns it.
//
// The third class is the find. A subject that four different articles each
// stop to explain, with no page to send the reader to, is a page the corpus
// is already asking for — and it is also four places where the same
// explanation is being written out again slightly differently.
//
// WHAT IT DOES NOT DO
//
// It asserts nothing and is not in `npm test`. There is no threshold at
// which a topic deserves a page: mention count measures how often a subject
// comes up, not whether anyone searches for it, and a pass run to clear a
// list produces padding. Two of the top candidates in the first run were
// correctly rejected — one was a pillar's own section heading, another a
// term that is a synonym for a page that already exists. The tool makes the
// shortlist cheap; the judgement stays manual.
//
// It also cannot see topics the corpus has never mentioned at all. Nothing
// offline can. That is a keyword-research job against real search data, not
// something a static-site audit can substitute for.
//
// Usage: node tools/audit-topic-coverage.mjs [--min N] [--section food] [--local]
//   --min N     mentions needed to report an orphaned topic (default 3)
//   --section   restrict the mention scan to one section
//   --local     also list the mentioned-once topics, which is a long tail

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CONTENT = new URL('../src/content/', import.meta.url).pathname;

const argv = process.argv;
const MIN = argv.includes('--min') ? Number(argv[argv.indexOf('--min') + 1]) : 3;
const SECTION = argv.includes('--section') ? argv[argv.indexOf('--section') + 1] : null;
const SHOW_LOCAL = argv.includes('--local');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
}

const normalise = (s) =>
  s
    .toLowerCase()
    .replace(/[’']s\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Phrases that are grammar rather than subjects. A bolded "Best for" or
// "Getting there" is a label on a list item, not a thing anyone searches.
const STOP_STARTS =
  /^(the|a|an|and|but|for|from|in|on|at|to|with|by|do|does|don t|not|no|yes|if|when|where|what|which|how|why|best|worth|avoid|note|warning|tip|add|take|book|check|use|go|see|read|allow|expect|assume|bring|carry|pay|ask|never|always|most|many|some|all|one|two|three|four|five|six|seven|eight|nine|ten)\b/;

const STOP_EXACT = new Set([
  'getting there', 'getting around', 'days needed', 'best season', 'what to know',
  'practical notes', 'frequently asked questions', 'before you go', 'coming back',
  'what it is', 'what it is not', 'how it runs', 'where it operates', 'topping up',
]);

// ---------------------------------------------------------------------------
// Pass one: what each page claims to be about.
// ---------------------------------------------------------------------------

const files = walk(CONTENT);
const pages = [];
const owned = new Set();

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const front = fm ? fm[1] : '';
  const body = fm ? raw.slice(fm[0].length) : raw;

  const field = (name) => {
    const m = front.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  };

  const kwLine = front.match(/^keywords:\s*\[(.*)\]/m);
  const keywords = kwLine
    ? kwLine[1].split(',').map((k) => k.trim()).filter(Boolean)
    : [];

  const rel = file.slice(CONTENT.length);
  const section = rel.includes('/') ? rel.split('/')[0] : 'root';

  const page = {
    rel,
    section,
    title: field('title'),
    navTitle: field('navTitle'),
    question: field('question'),
    keywords,
    body,
  };
  pages.push(page);

  for (const claim of [page.title, page.navTitle, page.question, ...keywords]) {
    const n = normalise(claim);
    if (n) owned.add(n);
  }
  // Headings are what a page hosts a section about, which is close enough to
  // ownership that promoting one to its own page would be a split, not a gap.
  for (const m of body.matchAll(/^#{2,3}\s+(.+)$/gm)) owned.add(normalise(m[1]));

  // First-column table cells are ownership too, and missing this made the
  // first run useless. The `things-to-do.md` pages list each sight with its
  // Chinese name, its address in characters and its metro line — which is a
  // more complete entry than a paragraph would be. Without this the tool
  // reported the Summer Palace, the Lama Temple, Jingshan Park, Beihai Park,
  // the National Museum of China and Wukang Mansion as uncovered subjects,
  // when every one of them has a full row on the relevant city page. Six of
  // the top eighteen candidates were that same false positive.
  for (const m of body.matchAll(/^\|\s*([^|\n]+?)\s*\|/gm)) {
    const cell = m[1];
    if (/^-+$/.test(cell) || !cell) continue;
    owned.add(normalise(cell.replace(/\*\*/g, '').replace(/\([^)]*\)/g, '')));
  }
}

// A claim owns a topic when it IS that topic, or when it is a longer phrase
// containing it — "lingyin temple hangzhou" as a keyword owns "lingyin temple".
//
// The reverse must NOT count, and the first version had it. Letting a topic
// that contains a claim be owned by it means the one-word table cell "beijing"
// owns "beihai park", and adding table cells to the claim set silently took
// the report from eighteen candidates to zero. A containment test that runs
// both ways is not a test.
const isOwned = (topic) => {
  if (owned.has(topic)) return true;
  for (const o of owned) if (o.length > topic.length && o.includes(topic)) return true;
  return false;
};

// ---------------------------------------------------------------------------
// Pass two: which subjects the prose keeps naming.
// ---------------------------------------------------------------------------

const mentions = new Map(); // topic -> Set of page rel paths

for (const page of pages) {
  if (SECTION && page.section !== SECTION) continue;
  const seen = new Set();
  for (const m of page.body.matchAll(/\*\*([^*\n]{4,60})\*\*/g)) {
    const topic = normalise(m[1]);
    const words = topic.split(' ');
    if (words.length < 2 || words.length > 5) continue;
    if (STOP_STARTS.test(topic) || STOP_EXACT.has(topic)) continue;
    if (/^\d/.test(topic)) continue;
    if (seen.has(topic)) continue;
    seen.add(topic);
    if (!mentions.has(topic)) mentions.set(topic, new Set());
    mentions.get(topic).add(page.rel);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const bySection = new Map();
for (const p of pages) {
  const s = bySection.get(p.section) ?? { pages: 0, keywords: 0 };
  s.pages++;
  s.keywords += p.keywords.length;
  bySection.set(p.section, s);
}

console.log('\nTopic coverage');
console.log(`  pages                ${pages.length}`);
console.log(`  distinct claims      ${owned.size}  (titles, navTitles, keywords, headings)`);
console.log(`  bolded subjects      ${mentions.size}\n`);

console.log('  section          pages   keywords   per page');
for (const [name, s] of [...bySection].sort((a, b) => b[1].pages - a[1].pages)) {
  console.log(
    `  ${name.padEnd(15)} ${String(s.pages).padStart(5)} ${String(s.keywords).padStart(10)} ${(s.keywords / s.pages).toFixed(1).padStart(10)}`
  );
}

const scored = [...mentions.entries()]
  .map(([topic, pagesSet]) => ({ topic, pages: [...pagesSet] }))
  .filter((t) => !isOwned(t.topic))
  .sort((a, b) => b.pages.length - a.pages.length || a.topic.localeCompare(b.topic));

const orphaned = scored.filter((t) => t.pages.length >= MIN);
const local = scored.filter((t) => t.pages.length === 1);

console.log(`\nOrphaned subjects — named on ${MIN}+ pages, owned by none${SECTION ? ` (scan: /${SECTION}/)` : ''}`);
console.log(`  ${orphaned.length} found\n`);
for (const t of orphaned) {
  console.log(`  ${String(t.pages.length).padStart(2)}  ${t.topic}`);
  console.log(`      ${t.pages.join(', ')}`);
}

console.log(`\n  mentioned on exactly one page: ${local.length}${SHOW_LOCAL ? '' : '  (--local to list)'}`);
if (SHOW_LOCAL) for (const t of local) console.log(`      ${t.topic}   [${t.pages[0]}]`);
console.log();
