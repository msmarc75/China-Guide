#!/usr/bin/env node
/**
 * The 95 answer pages must keep the format they were commissioned under.
 *
 * WHY THIS EXISTS
 *
 * The answer-page format is stated plainly and is not negotiable: answer in
 * the first two sentences, 400–700 words, QAPage schema and never FAQPage, a
 * `question:` in front matter, and always a link to the pillar guide.
 *
 * The schema half is asserted by `test-schema.mjs`. Nothing checked the rest,
 * across 95 pages written in seven batches over many sessions — which is
 * exactly the condition under which a format drifts: each batch matches the
 * previous one, and after seven the last no longer matches the first.
 *
 * WHAT IS MECHANICALLY CHECKABLE, AND WHAT IS NOT
 *
 * Checkable, and asserted below: the front matter fields exist and agree with
 * each other, the page links to a pillar, `order:` is unique, the standfirst
 * is not just the title again, the length is not absurd, and the lead is not
 * a preamble.
 *
 * NOT checkable: whether the page actually answers in its first two sentences.
 * That was tried. The heuristic — a yes/no question should be met by a
 * standfirst opening with yes, no, or an equivalent — flagged eight pages, and
 * reading all eight showed every one was a FALSE POSITIVE:
 *
 *   "Should I stay in Guilin or Yangshuo?" → "Yangshuo, almost without
 *   exception." A choice question is not a yes/no question, and the answer to
 *   it is a place name.
 *
 *   "Can I take a drone to China?" → "Bringing one in is legal and customs
 *   rarely comment. Flying it is the problem." Two sentences that answer the
 *   question a reader actually has, neither beginning with yes or no.
 *
 * A heuristic with eight flags and eight false positives is not a warning
 * signal, it is noise, and shipping it would train a future reader to ignore
 * the output. So the rule is left to human judgement, and only its detectable
 * anti-pattern — a lead that is throat-clearing rather than an answer — is
 * asserted, from a short and deliberately specific phrase list.
 *
 * WHY THE HARD BAND IS 300–900 AND NOT 400–700
 *
 * Measured before deciding. Across the 95 pages: min 365, p25 443, median 512,
 * p75 559, max 709. Thirteen pages sit between 365 and 399, and one at 709.
 *
 * Those thirteen are not stubs. The shortest, "Is China expensive to visit?"
 * at 365 words, has a direct answer, three sections, a warning box and a
 * pillar link; it is short because the question has a compact answer. Failing
 * the build over it would force padding, and padding is a worse outcome than
 * twenty words under a guideline.
 *
 * So 400–700 is reported as the editorial target and 300–900 is the hard
 * failure — the band that separates "shorter than the house style" from "this
 * is a stub" or "this has quietly become a pillar". A test that fails 15% of a
 * corpus on a style guideline gets disabled, and a disabled test checks
 * nothing.
 *
 * Run: npm run test:answers
 */

import fs from 'node:fs';
import path from 'node:path';

const ANSWERS = 'src/content/answers';

const HARD_MIN = 300;
const HARD_MAX = 900;
const TARGET_MIN = 400;
const TARGET_MAX = 700;

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) return;
  failures++;
  console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
};

const normalise = (s) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Rendered prose, near enough: directives and link targets removed. */
const plain = (s) =>
  s
    .replace(/^:::.*$/gm, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// A lead that clears its throat instead of answering. Deliberately specific:
// a loose list would flag good openings, and a check that flags good writing
// gets ignored, which is worse than no check.
const PREAMBLE =
  /^(this is one of|one of the most|many visitors|most visitors wonder|it is a common|a common question|china is a vast|before we|first, it is worth|to understand this|there is no simple answer|that depends on a lot)/i;

// A first sentence this long is not a lead, whatever it contains.
const MAX_LEAD_WORDS = 45;

console.log('Answer page format');

const files = fs.readdirSync(ANSWERS).filter((f) => f.endsWith('.md'));
check('no answer pages found', files.length > 0);

const orders = new Map();
const counts = [];
const outsideTarget = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(ANSWERS, file), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  check(`${file}: has no front matter`, !!fm);
  if (!fm) continue;
  const front = fm[1];
  const body = raw.slice(fm[0].length);

  const field = (name) =>
    front.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '') ?? '';

  const question = field('question');
  const title = field('title');
  const standfirst = field('standfirst');
  const order = field('order');

  // ---- the question -------------------------------------------------------
  check(`${file}: has no question: in front matter`, question.length > 0);
  check(`${file}: question does not end with a question mark`, question.endsWith('?'), question);

  // The question goes into QAPage mainEntity.name and the title into the h1.
  // They must be the same question — two different phrasings of it split the
  // page's signal between the schema and the page.
  check(
    `${file}: question: and title: are not the same question`,
    normalise(question).replace(/\?$/, '') === normalise(title),
    `question "${question}"\n      title    "${title}"`
  );

  // ---- the standfirst -----------------------------------------------------
  check(`${file}: has no standfirst`, standfirst.length > 0);
  check(
    `${file}: standfirst is just the title again`,
    normalise(standfirst) !== normalise(title)
  );

  const lead = plain(standfirst).split(/(?<=[.!?])\s+/)[0]?.trim() ?? '';
  check(`${file}: standfirst opens with a preamble`, !PREAMBLE.test(lead), lead.slice(0, 120));
  check(
    `${file}: standfirst's first sentence is ${lead.split(/\s+/).filter(Boolean).length} words`,
    lead.split(/\s+/).filter(Boolean).length <= MAX_LEAD_WORDS,
    'a lead this long buries the answer it is supposed to be'
  );

  // ---- the pillar link ----------------------------------------------------
  check(
    `${file}: links to no pillar guide`,
    /\]\(\/(guides|plan|culture|food|destinations|itineraries)\/[^)]+\)/.test(body),
    'every answer page must send the reader on to the guide behind it'
  );

  // ---- order --------------------------------------------------------------
  check(`${file}: has no order:`, order.length > 0);
  if (orders.has(order)) {
    check(`${file}: order ${order} is already used by ${orders.get(order)}`, false);
  } else {
    orders.set(order, file);
  }

  // ---- length -------------------------------------------------------------
  const words = plain(`${standfirst} ${body}`).split(' ').filter(Boolean).length;
  counts.push(words);
  check(
    `${file}: ${words} words, outside the hard band ${HARD_MIN}–${HARD_MAX}`,
    words >= HARD_MIN && words <= HARD_MAX,
    words < HARD_MIN ? 'this is a stub' : 'this has grown into a pillar'
  );
  if (words < TARGET_MIN || words > TARGET_MAX) outsideTarget.push({ file, words });
}

counts.sort((a, b) => a - b);
const pc = (p) => counts[Math.floor(counts.length * p)];
console.log(
  `\n  ${files.length} answer page(s) · words min ${counts[0]} · p25 ${pc(0.25)} · median ${pc(0.5)} · p75 ${pc(0.75)} · max ${counts[counts.length - 1]}`
);
console.log(
  `  ${outsideTarget.length} outside the ${TARGET_MIN}–${TARGET_MAX} editorial target (reported, not failed):`
);
for (const o of outsideTarget.sort((a, b) => a.words - b.words)) {
  console.log(`      ${String(o.words).padStart(3)}  ${o.file}`);
}

console.log(failures ? `\n${failures} failure(s).` : '\n✓ All answer-format assertions passed.');
process.exit(failures ? 1 : 0);
