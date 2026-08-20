#!/usr/bin/env node
// How much a pillar's FAQ answer repeats the answer page it links to.
//
// WHY THIS EXISTS
//
// The 95 answer pages exist because Phase 6 promoted pillar FAQ answers into
// standalone pages — and each pillar KEPT its short answer and added a link.
// That design creates near-duplicate text between a pillar and its answer page
// BY CONSTRUCTION, on around a hundred pairs, and nobody measured how much.
//
// It matters because the two pages are competing for the same query. A pillar
// FAQ answer that is a compressed but freshly-worded summary is doing its job:
// it satisfies a reader who is already on the pillar and sends the one who
// wants more. A pillar FAQ answer that is the answer page's own sentences with
// the middle cut out is two pages saying one thing, and the weaker one is the
// pillar's.
//
// WHAT IT MEASURES
//
//   PAIR OVERLAP    for each pillar FAQ answer that links to /answers/, the
//                   sentences it shares with that page's standfirst and
//                   opening — exact after normalisation, and near-identical
//                   above a similarity threshold.
//   CORPUS ECHOES   sentences appearing on three or more pages anywhere. This
//                   is a different and usually worse problem: a pillar and its
//                   own answer page repeating each other is at least a related
//                   pair, while the same sentence on four unrelated pages is
//                   just boilerplate that escaped.
//
// WHY THE THRESHOLD IS 0.6 AND NOT SOMETHING ROUNDER
//
// Measured against the corpus rather than guessed. At 0.8 the tool found only
// verbatim-with-a-word-changed and missed the real pattern, which is a sentence
// rebuilt with the same content words in a different order. At 0.5 it started
// pairing any two sentences about the same subject — "eat where locals queue"
// matched three unrelated food sentences. 0.6 separates them, and each hit is
// printed in full so the judgement stays with a reader rather than the number.
//
// WHAT IT DOES NOT ASSERT
//
// Nothing, and it is deliberately not in `npm test`. Some overlap is correct:
// both pages answer the same question, and a summary that shares no vocabulary
// with the thing it summarises is usually a summary of something else. A
// threshold here would force rewrites that damage the pillar to satisfy a
// script. The tool narrows a hundred pairs to a shortlist; a person reads both
// sides and decides.
//
// Usage: node tools/audit-duplication.mjs [--min 0.6] [--all]

import fs from 'node:fs';
import path from 'node:path';

const CONTENT = 'src/content';
const argv = process.argv;
const MIN = argv.includes('--min') ? Number(argv[argv.indexOf('--min') + 1]) : 0.6;
const ALL = argv.includes('--all');

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
};

/** The build's rule: pages/ maps to root, everything else to /section/slug/. */
const urlOf = (file) => {
  const rel = path.relative(CONTENT, file).replace(/\\/g, '/').replace(/\.md$/, '');
  return rel.startsWith('pages/') ? `/${rel.slice('pages/'.length)}/` : `/${rel}/`;
};

const normalise = (s) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Strip markdown so a link's target does not count as words in the sentence. */
const plain = (s) =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Sentences long enough to be a claim rather than a fragment.
 *
 * Two different floors, for two different jobs. The corpus-wide echo scan
 * needs 8 words, or it reports every "Do not tip." and "Book ahead." as a
 * duplicate across forty pages. A pillar/answer PAIR needs less: these are two
 * pages on one question, so a repeated five-word opener like "Not for mainland
 * stays." is exactly the copied-lead pattern being looked for. The first
 * version used 8 for both and under-reported — it caught one sentence of the
 * Airbnb pair when three were near-identical, verified by hand against the
 * source.
 */
const sentencesOf = (text, minWords) =>
  plain(text)
    .split(/(?<=[.!?])\s+(?=[A-Z“"])/)
    .map((s) => s.trim())
    .filter((s) => normalise(s).split(' ').filter(Boolean).length >= minWords);

const PAIR_MIN_WORDS = 4;
const ECHO_MIN_WORDS = 8;
const sentences = (text) => sentencesOf(text, ECHO_MIN_WORDS);

const similarity = (a, b) => {
  const A = new Set(normalise(a).split(' ').filter(Boolean));
  const B = new Set(normalise(b).split(' ').filter(Boolean));
  if (!A.size || !B.size) return 0;
  const shared = [...A].filter((w) => B.has(w)).length;
  return shared / new Set([...A, ...B]).size;
};

// ---------------------------------------------------------------------------
// Read every page: front matter, body, FAQ block.
// ---------------------------------------------------------------------------

const pages = new Map();
for (const file of walk(CONTENT)) {
  const raw = fs.readFileSync(file, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const front = fm ? fm[1] : '';
  const body = fm ? raw.slice(fm[0].length) : raw;
  const standfirst =
    front.match(/^standfirst:\s*(.+)$/m)?.[1].replace(/^["']|["']$/g, '') ?? '';
  pages.set(urlOf(file), { file, body, standfirst });
}

/** FAQ entries: { question, answer } from the "## Frequently asked questions" block. */
const faqOf = (body) => {
  const start = body.search(/^## Frequently asked questions\s*$/m);
  if (start === -1) return [];
  const block = body.slice(start);
  const out = [];
  const parts = block.split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const question = part.slice(0, nl).trim();
    // Stop at the next ## heading, which ends the FAQ block.
    const answer = part.slice(nl + 1).split(/^## /m)[0].trim();
    out.push({ question, answer });
  }
  return out;
};

// ---------------------------------------------------------------------------
// Pair each linking FAQ answer with its answer page's opening.
// ---------------------------------------------------------------------------

const pairs = [];
for (const [url, page] of pages) {
  for (const faq of faqOf(page.body)) {
    for (const m of faq.answer.matchAll(/\]\((\/answers\/[^)]+)\)/g)) {
      const target = m[1].endsWith('/') ? m[1] : `${m[1]}/`;
      const answerPage = pages.get(target);
      if (!answerPage) continue;
      // The opening is what competes: the standfirst plus the prose before the
      // first subheading. Beyond that the answer page is saying more, which is
      // the point of it existing.
      const opening = answerPage.body.split(/^## /m)[0];
      pairs.push({
        from: url,
        to: target,
        question: faq.question,
        pillarSentences: sentencesOf(faq.answer, PAIR_MIN_WORDS),
        answerSentences: sentencesOf(`${answerPage.standfirst} ${opening}`, PAIR_MIN_WORDS),
      });
    }
  }
}

console.log('\nPillar FAQ answers against the answer pages they link to');
console.log(`  pairs                ${pairs.length}`);

let exactTotal = 0;
let nearTotal = 0;
const scored = [];

for (const p of pairs) {
  const hits = [];
  for (const a of p.pillarSentences) {
    let best = null;
    for (const b of p.answerSentences) {
      const s = normalise(a) === normalise(b) ? 1 : similarity(a, b);
      if (s >= MIN && (!best || s > best.score)) best = { score: s, a, b };
    }
    if (best) hits.push(best);
  }
  const exact = hits.filter((h) => h.score === 1).length;
  exactTotal += exact;
  nearTotal += hits.length - exact;
  scored.push({ ...p, hits, exact });
}

const bucket = (n) => (n === 0 ? '0' : n === 1 ? '1' : n === 2 ? '2' : '3+');
const dist = { 0: 0, 1: 0, 2: 0, '3+': 0 };
for (const s of scored) dist[bucket(s.hits.length)]++;

console.log(`  exact shared sent.   ${exactTotal}`);
console.log(`  near-identical       ${nearTotal}  (similarity >= ${MIN})`);
console.log(`  pairs sharing 0      ${dist['0']}`);
console.log(`  pairs sharing 1      ${dist['1']}`);
console.log(`  pairs sharing 2      ${dist['2']}`);
console.log(`  pairs sharing 3+     ${dist['3+']}\n`);

const worst = scored.filter((s) => s.hits.length > 0).sort((a, b) => b.hits.length - a.hits.length);
for (const s of ALL ? worst : worst.slice(0, 15)) {
  console.log(`  ${s.hits.length} hit(s)  ${s.from}  →  ${s.to}`);
  console.log(`      Q: ${s.question}`);
  for (const h of s.hits) {
    console.log(`      ${h.score === 1 ? 'EXACT' : h.score.toFixed(2)}`);
    console.log(`        pillar: ${h.a}`);
    console.log(`        answer: ${h.b}`);
  }
  console.log();
}
if (!ALL && worst.length > 15) console.log(`  … ${worst.length - 15} more (--all)\n`);

// ---------------------------------------------------------------------------
// Corpus-wide echoes: the same sentence on three or more pages.
// ---------------------------------------------------------------------------

const bySentence = new Map();
for (const [url, page] of pages) {
  const seen = new Set();
  for (const s of sentences(page.body)) {
    const k = normalise(s);
    if (seen.has(k)) continue;
    seen.add(k);
    if (!bySentence.has(k)) bySentence.set(k, { text: s, urls: [] });
    bySentence.get(k).urls.push(url);
  }
}
const echoes = [...bySentence.values()].filter((e) => e.urls.length >= 3);

console.log(`Sentences appearing verbatim on three or more pages  (${echoes.length})`);
for (const e of echoes.sort((a, b) => b.urls.length - a.urls.length)) {
  console.log(`  ${e.urls.length}×  ${e.text}`);
  console.log(`      ${e.urls.join(', ')}`);
}
console.log();
