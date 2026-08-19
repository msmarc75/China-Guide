#!/usr/bin/env node
// Extracts every metro/rail claim in the content so an auditor can check them
// against Chinese sources in one sitting instead of re-reading 124 pages.
//
// Why this exists: transit claims are the highest-yield defect class on this
// site — thirteen wrong ones found so far. They are also the most perishable.
// A line extension or a through-running change silently falsifies a sentence
// that was correct when written, and English sources reproduce the stale
// version for years. The Guanglan Road defect (PR #46) sat wrong for seven
// years because nobody re-read that paragraph.
//
// This prints claims grouped by page. It asserts nothing — there is no
// machine-checkable ground truth for "does line 4 still serve this station".
// The value is purely in making the review cheap and exhaustive.
//
// Usage: node tools/extract-transit-claims.mjs [--page <substring>]

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const CONTENT = new URL('../src/content/', import.meta.url).pathname;

// A sentence is a transit claim if it names a line, a station, an
// interchange or a rail journey. Kept deliberately broad — a false positive
// costs one line of reading, a false negative costs an unaudited claim.
const TRIGGERS = [
  /\bline\s+\d+\b/i,
  /\bline\s+(?:S\d+|APM|[A-Z]{2,4})\b/,
  /\b(?:metro|subway|underground)\b/i,
  /\bstation\b/i,
  /\binterchange\b/i,
  /\bchange (?:at|to|trains)\b/i,
  /\b(?:high-speed|bullet)\s+(?:rail|train)\b/i,
  /\bmaglev\b/i,
  /\bairport express\b/i,
  /站\b/,
];

// Sentences that merely mention a station in passing, with no checkable
// assertion attached, are noise. These filter the worst offenders.
const NOISE = [
  /^\s*[-*]\s*$/,
  /^#{1,6}\s/,
];

function sentences(md) {
  // Strip frontmatter, code fences and container directives' markers, but
  // keep table rows — a surprising number of transit claims live in tables.
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, '');
  return body
    .split(/\n/)
    .flatMap((line) => {
      if (line.trim().startsWith('|')) return [line.trim()];
      return line.split(/(?<=[.!?;])\s+/);
    })
    .map((s) => s.trim())
    .filter(Boolean);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
}

const filter = process.argv.includes('--page')
  ? process.argv[process.argv.indexOf('--page') + 1]
  : null;

const files = walk(CONTENT).sort();
let pages = 0;
let claims = 0;

for (const file of files) {
  const rel = relative(CONTENT, file).replace(/\.md$/, '');
  if (filter && !rel.includes(filter)) continue;
  const hits = sentences(readFileSync(file, 'utf8')).filter(
    (s) => !NOISE.some((n) => n.test(s)) && TRIGGERS.some((t) => t.test(s)),
  );
  if (!hits.length) continue;
  pages += 1;
  claims += hits.length;
  console.log(`\n=== ${rel} (${hits.length}) ===`);
  for (const h of hits) console.log(`  ${h.length > 260 ? `${h.slice(0, 257)}...` : h}`);
}

console.log(`\n${claims} transit claims across ${pages} pages.`);
