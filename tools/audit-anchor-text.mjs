#!/usr/bin/env node
// What the internal links SAY, as opposed to where they point.
//
// WHY THIS EXISTS
//
// Every other link tool here measures the graph — how many inbound links a
// page has, whether it is reachable from outside its cluster, whether it is
// orphaned. None of them look at the words. And the words are where the last
// defect of this kind came from.
//
// In #69 four anchors echoed their target's title verbatim — "where to eat in
// Xi'an" pointing at a page titled "Where to Eat in Xi'an" — and one
// overclaimed outright: I wrote "Chengdu's teahouse-and-foot-massage culture"
// for a page that is largely about 采耳 ear cleaning and its infection risk,
// because I wrote the anchor before reading the page. All five were caught by
// re-reading the diff, which is not a process, and nothing would have caught
// the next one.
//
// WHAT IT LOOKS FOR
//
//   TITLE ECHO      the anchor is the target's own title read back. It tells
//                   a reader nothing they cannot see from the destination and
//                   wastes the one chance to say why they should click.
//   AMBIGUOUS       the same words pointing at different pages. A reader
//                   scanning a page sees two identical links and cannot tell
//                   them apart; a search engine gets a contradictory signal.
//   INCONSISTENT    one page reached by many unlike anchors. Often healthy
//                   variety, sometimes a page with no clear identity — the
//                   distribution is reported and the judgement is left here.
//   WEAK            one- or two-word anchors, which rarely describe anything.
//
// WHAT IT DOES NOT ASSERT
//
// Nothing, and it is deliberately not in `npm test`. There is no rule that
// makes anchor text good — a threshold would produce a pass of mechanical
// rewrites, and a corpus of anchors written to satisfy a script reads worse
// than one with a few title echoes in it. The tool narrows 500 links to a
// shortlist; a person still has to read the target page and decide.
//
// It also cannot see the failure that actually hurt most in #69 — an anchor
// that is well-formed, varied and specific, and describes the wrong page.
// Only reading both ends catches that.
//
// WHAT THE FIRST FULL RUN SETTLED, so it is not re-litigated every pass
//
// TITLE ECHO IS MOSTLY NOT A DEFECT HERE. The first run flagged 124 of 708
// links and almost none of them were worth changing. On a site where 95 pages
// are titled as questions, linking "is Google blocked in China?" to the page
// called exactly that is the BEST available anchor — the reader gets precisely
// what the words promised. And "the money and payments guide" is simply how
// English refers to a guide. The #69 defect was narrower: links added in bulk
// to improve discoverability, where the anchor had one job — say why to click
// — and instead read the destination's title back. Read the bucket as a
// shortlist for that situation, not as a list of things to rewrite.
//
// WEAK IS MOSTLY NOT A DEFECT EITHER. 139 one- and two-word anchors, nearly
// all of them "visa guide", "transport guide", "Hangzhou guide" at the end of
// a sentence that has already supplied the context. Fine.
//
// THE FOUR REPEATED CHILD ANCHORS ARE CORRECT. "things to do", "restaurants",
// "nightlife" and "massage and spa" each point at four different pages — but
// each is used on its own city's parent page, where the city is the subject of
// every sentence around it. Ambiguity is a property of a reader's context, not
// of a string, and this tool only sees the string.
//
// Usage: node tools/audit-anchor-text.mjs [--section answers] [--all]

import fs from 'node:fs';
import path from 'node:path';
import { walkHtml, urlOf, editorialRegion, isArticle } from './lib/inbound-links.mjs';

const DIST = new URL('../dist/', import.meta.url).pathname;
const CONTENT = new URL('../src/content/', import.meta.url).pathname;

const argv = process.argv;
const SECTION = argv.includes('--section') ? argv[argv.indexOf('--section') + 1] : null;
const ALL = argv.includes('--all');

const normalise = (s) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Stripped before comparing an anchor against a title: they are the words a
// writer adds to make a title into a sentence, and leaving them in would hide
// the echo. "the Xi'an restaurants guide" is still an echo of "Xi'an
// Restaurants".
const FILLER = /\b(the|a|an|our|this|that|these|those|guide|page|section|full|complete|more|about|on|to|in|at|for|and|of|is|are|see|read)\b/g;
const stripped = (s) => normalise(s).replace(FILLER, ' ').replace(/\s+/g, ' ').trim();

/** Jaccard overlap of the significant words in two strings. */
const overlap = (a, b) => {
  const A = new Set(stripped(a).split(' ').filter(Boolean));
  const B = new Set(stripped(b).split(' ').filter(Boolean));
  if (!A.size || !B.size) return 0;
  const shared = [...A].filter((w) => B.has(w)).length;
  return shared / new Set([...A, ...B]).size;
};

// ---------------------------------------------------------------------------
// Titles, from the source front matter.
// ---------------------------------------------------------------------------

const titles = new Map(); // url -> { title, navTitle }
const walkMd = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMd(p, out);
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
};
for (const md of walkMd(CONTENT)) {
  const front = fs.readFileSync(md, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const field = (n) =>
    front.match(new RegExp(`^${n}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '') ?? '';
  const url = `/${path.relative(CONTENT, md).replace(/\\/g, '/').replace(/\.md$/, '')}/`;
  titles.set(url, { title: field('title'), navTitle: field('navTitle') });
}

// ---------------------------------------------------------------------------
// Every editorial link, with its words.
//
// editorialRegion() from the shared module is what decides "editorial" — the
// prose region only, with the generated related block, the asides and the ad
// slots removed. Three copies of that logic disagreed once; there is one now.
// ---------------------------------------------------------------------------

const links = [];
for (const file of walkHtml(DIST)) {
  const from = urlOf(DIST, file);
  if (!isArticle(from)) continue;
  if (SECTION && !from.startsWith(`/${SECTION}/`)) continue;
  const region = editorialRegion(fs.readFileSync(file, 'utf8'));
  for (const m of region.matchAll(/<a href="(\/[^"#?]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const to = m[1].endsWith('/') ? m[1] : `${m[1]}/`;
    const text = m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!text || to === from) continue;
    links.push({ from, to, text });
  }
}

console.log(`\nAnchor text${SECTION ? ` — /${SECTION}/` : ''}`);
console.log(`  editorial links   ${links.length}`);
console.log(`  distinct targets  ${new Set(links.map((l) => l.to)).size}`);
console.log(`  distinct anchors  ${new Set(links.map((l) => normalise(l.text))).size}\n`);

// ---------------------------------------------------------------------------
// 1. Title echo
// ---------------------------------------------------------------------------

// The first version of this scored every anchor against both `title` and
// `navTitle` at a 0.7 Jaccard threshold and reported 271 of 708 links — 38%,
// which is not a defect rate, it is a broken measure.
//
// Two things were wrong. Short strings saturate Jaccard: "accommodation
// guide" against the navTitle "Accommodation" is 1.00 once the filler word
// goes, and that is a perfectly good anchor. And the report printed `title`
// while the match had come from `navTitle`, so the pairings on screen looked
// nonsensical and hid the real ones.
//
// The defect in #69 was not a short natural reference. It was a
// sentence-length anchor that WAS the title: "where to eat in Xi'an" for a
// page called "Where to Eat in Xi'an". So an echo needs both sides to carry
// at least three significant words, and the field that matched is named.
const MIN_WORDS = 3;
const echoes = [];
for (const l of links) {
  const t = titles.get(l.to);
  if (!t) continue;
  if (stripped(l.text).split(' ').filter(Boolean).length < MIN_WORDS) continue;
  for (const [field, value] of [['title', t.title], ['navTitle', t.navTitle]]) {
    if (!value) continue;
    if (stripped(value).split(' ').filter(Boolean).length < MIN_WORDS) continue;
    const score = overlap(l.text, value);
    if (score >= 0.7) {
      echoes.push({ ...l, field, value, score });
      break;
    }
  }
}
echoes.sort((a, b) => b.score - a.score);

console.log(`Title echo — anchor repeats the target's own title  (${echoes.length})`);
for (const e of echoes) {
  console.log(`  ${e.score.toFixed(2)}  "${e.text}"`);
  console.log(`        → ${e.to}  ${e.field} "${e.value}"`);
  console.log(`        on ${e.from}`);
}

// ---------------------------------------------------------------------------
// 2. Ambiguous anchors — same words, different destinations
// ---------------------------------------------------------------------------

const byText = new Map();
for (const l of links) {
  const k = normalise(l.text);
  if (!byText.has(k)) byText.set(k, new Map());
  const targets = byText.get(k);
  targets.set(l.to, [...(targets.get(l.to) ?? []), l.from]);
}
const ambiguous = [...byText.entries()].filter(([, targets]) => targets.size > 1);

console.log(`\nAmbiguous — identical anchor text, different targets  (${ambiguous.length})`);
for (const [text, targets] of ambiguous) {
  console.log(`  "${text}"`);
  for (const [to, froms] of targets) console.log(`        → ${to}   from ${froms.join(', ')}`);
}

// ---------------------------------------------------------------------------
// 3. Inconsistent targets — one page, many unlike anchors
// ---------------------------------------------------------------------------

const byTarget = new Map();
for (const l of links) {
  if (!byTarget.has(l.to)) byTarget.set(l.to, new Set());
  byTarget.get(l.to).add(l.text);
}
const varied = [...byTarget.entries()]
  .map(([to, set]) => ({ to, anchors: [...set] }))
  .filter((x) => x.anchors.length >= 4)
  .sort((a, b) => b.anchors.length - a.anchors.length);

console.log(`\nMost-varied targets — 4+ distinct anchors  (${varied.length})`);
for (const v of varied.slice(0, ALL ? varied.length : 8)) {
  console.log(`  ${String(v.anchors.length).padStart(2)}  ${v.to}`);
  for (const a of v.anchors) console.log(`        "${a}"`);
}

// ---------------------------------------------------------------------------
// 4. Weak anchors
// ---------------------------------------------------------------------------

const weak = links.filter((l) => normalise(l.text).split(' ').filter(Boolean).length <= 2);
console.log(`\nWeak — one or two words  (${weak.length})`);
for (const w of weak) console.log(`  "${w.text}"  → ${w.to}   on ${w.from}`);

console.log();
