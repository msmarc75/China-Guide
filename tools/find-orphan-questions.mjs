#!/usr/bin/env node
// Finds pillar FAQ questions that have no answer page behind them.
//
// Why this exists: pillar pages carry FAQ blocks, and a question in one of
// those blocks gets three or four sentences. Some of them deserve a page —
// they have one right answer, they are what someone actually types into a
// search box, and three sentences is not an answer. Phase 6 is the work of
// promoting those. This tool is how the next candidate gets chosen.
//
// WHY IT MATCHES ON LINKS AND NOT JUST ON TEXT
//
// The first version of this compared the FAQ heading against each answer
// page's `question:` front matter, normalised. That is wrong, and wrong in
// the expensive direction: it reports a question as unanswered whenever the
// pillar phrases it differently from the page. "Can foreigners use Alipay in
// China?" and "Can I use Alipay as a foreigner in China?" are the same
// question; one is a heading, the other is a page that has existed for weeks.
//
// It over-reported by enough to nearly cost a batch of duplicate pages. So a
// question now counts as answered if EITHER
//
//   (a) some answer page's `question:` matches it once normalised, or
//   (b) the FAQ answer body links to an /answers/ page.
//
// (b) is the reliable signal, because promoting a question to a page always
// includes linking the pillar to it. A heading with no such link and no text
// match is genuinely uncovered.
//
// Asserts nothing, and is not in `npm test`. Which questions deserve a page
// is an editorial judgement — the tool's job is to make the shortlist cheap
// and to stop the same page being written twice.
//
// Usage: node tools/find-orphan-questions.mjs [section] [--all]
//   section   limit the listing to one content section, e.g. food
//   --all     list every section's questions rather than just the counts

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CONTENT = new URL('../src/content/', import.meta.url).pathname;

// Under four words a heading is not a search query — "Is it safe?" tells you
// nothing about what page it would become.
const MIN_WORDS = 4;

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
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const files = walk(CONTENT);
const rel = (f) => f.slice(CONTENT.length);

const answeredText = new Set();
for (const f of files.filter((f) => rel(f).startsWith('answers/'))) {
  const m = readFileSync(f, 'utf8').match(/^question:\s*(.+)$/m);
  if (m) answeredText.add(normalise(m[1]));
}

// Walk each pillar's FAQ block, pairing every heading with the body beneath
// it, so that (b) can be tested against the right paragraphs.
function faqEntries(text) {
  const out = [];
  const lines = text.split('\n');
  let heading = null;
  let body = [];
  for (const line of lines) {
    const m = line.match(/^### (.+\?)\s*$/);
    if (m) {
      if (heading) out.push([heading, body.join('\n')]);
      heading = m[1];
      body = [];
    } else if (heading) {
      if (/^#{1,3} /.test(line)) {
        out.push([heading, body.join('\n')]);
        heading = null;
        body = [];
      } else {
        body.push(line);
      }
    }
  }
  if (heading) out.push([heading, body.join('\n')]);
  return out;
}

const argv = process.argv.slice(2);
const listAll = argv.includes('--all');
const only = argv.find((a) => !a.startsWith('--'));

const bySection = new Map();
let covered = 0;

for (const f of files.filter((f) => !rel(f).startsWith('answers/'))) {
  const section = rel(f).split('/')[0];
  for (const [question, body] of faqEntries(readFileSync(f, 'utf8'))) {
    if (question.split(/\s+/).length < MIN_WORDS) continue;
    if (answeredText.has(normalise(question)) || /href="\/answers\/|\]\(\/answers\//.test(body)) {
      covered++;
      continue;
    }
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section).push([question, rel(f)]);
  }
}

const sections = [...bySection].sort((a, b) => b[1].length - a[1].length);
const total = sections.reduce((n, [, qs]) => n + qs.length, 0);

console.log('\nPillar FAQ questions with no answer page');
console.log(`  answer pages     ${answeredText.size}`);
console.log(`  already covered  ${covered}  (by matching text, or by the FAQ linking to a page)`);
console.log(`  uncovered        ${total}\n`);

for (const [section, qs] of sections) {
  console.log(`  ${String(qs.length).padStart(3)}  ${section}`);
  if (!listAll && only !== section) continue;
  for (const [q, f] of qs) console.log(`         ${q}   [${f}]`);
}
console.log();
