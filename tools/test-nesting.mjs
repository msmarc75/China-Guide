#!/usr/bin/env node
/**
 * Exercises nested content URLs against fixture content, so the feature stays
 * covered even before real child pages exist.
 *
 * Run: npm run test:nesting
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const check = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  }
};

function makeFixture({ withPillar = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctc-fixture-'));
  const destinations = path.join(dir, 'destinations');
  fs.mkdirSync(path.join(destinations, 'beijing'), { recursive: true });

  if (withPillar) {
    fs.writeFileSync(
      path.join(destinations, 'beijing.md'),
      `---\ntitle: Beijing Travel Guide\nnavTitle: Beijing\ndescription: Fixture pillar page used by the nesting test suite for China Trip Compass.\n---\n\n## Section\n\nPillar body.\n`
    );
  }
  fs.writeFileSync(
    path.join(destinations, 'beijing', 'restaurants.md'),
    `---\ntitle: Where to Eat in Beijing\nnavTitle: Restaurants\ndescription: Fixture child page used by the nesting test suite for China Trip Compass.\n---\n\n## Section\n\nChild body.\n`
  );
  return dir;
}

function build(contentDir) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctc-dist-'));
  execFileSync('node', [path.join(ROOT, 'src', 'build.mjs')], {
    cwd: ROOT,
    env: { ...process.env, CONTENT_DIR: contentDir, DIST_DIR: outDir },
    stdio: 'pipe',
  });
  return outDir;
}

/* -------------------------------------------------- 1. nesting works ------ */

console.log('Nested URLs');
const fixture = makeFixture();
const dist = build(fixture);

const childPath = path.join(dist, 'destinations', 'beijing', 'restaurants', 'index.html');
check('child page renders at the nested path', fs.existsSync(childPath), childPath);

const child = fs.existsSync(childPath) ? fs.readFileSync(childPath, 'utf8') : '';
const crumbs = /<nav class="breadcrumbs"[\s\S]*?<\/nav>/.exec(child)?.[0] || '';

check('breadcrumb links to the section', crumbs.includes('href="/destinations/"'));
check('breadcrumb links to the pillar', crumbs.includes('href="/destinations/beijing/"'));
check('breadcrumb ends on the child', crumbs.includes('Restaurants'));
check(
  'canonical uses the nested URL',
  child.includes('<link rel="canonical" href="https://chinatripcompass.com/destinations/beijing/restaurants/">')
);
check(
  'BreadcrumbList structured data has 4 levels',
  (child.match(/"@type":"ListItem"/g) || []).length >= 4
);

const pillar = fs.readFileSync(path.join(dist, 'destinations', 'beijing', 'index.html'), 'utf8');
check('pillar page links to its child', pillar.includes('href="/destinations/beijing/restaurants/"'));
check('pillar page renders the hub block', pillar.includes('class="child-hub"'));

const sectionIndex = fs.readFileSync(path.join(dist, 'destinations', 'index.html'), 'utf8');
check('section index lists the pillar', sectionIndex.includes('href="/destinations/beijing/"'));
check(
  'section index does NOT list the child',
  !sectionIndex.includes('href="/destinations/beijing/restaurants/"')
);

const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
check(
  'sitemap contains the nested URL',
  sitemap.includes('https://chinatripcompass.com/destinations/beijing/restaurants/')
);
const childEntry =
  /<url>\s*<loc>[^<]*\/destinations\/beijing\/restaurants\/<\/loc>[\s\S]*?<\/url>/.exec(sitemap)?.[0] || '';
check('nested pages get a lower sitemap priority', childEntry.includes('<priority>0.7</priority>'));

const searchIndex = JSON.parse(fs.readFileSync(path.join(dist, 'search-index.json'), 'utf8'));
check(
  'child page is in the search index',
  searchIndex.some((d) => d.u === '/destinations/beijing/restaurants/')
);

/* ------------------------------------- 2. missing pillar fails the build -- */

console.log('\nOrphan guard');
const orphanFixture = makeFixture({ withPillar: false });
let threw = false;
let message = '';
try {
  build(orphanFixture);
} catch (err) {
  threw = true;
  message = String(err.stderr || err.message);
}
check('build fails when the pillar page is missing', threw);
check(
  'error names the file to create',
  message.includes('Missing pillar page') && message.includes('destinations/beijing.md'),
  message.split('\n').slice(0, 3).join(' ')
);

/* ------------------------------------------------------------- cleanup --- */

for (const dir of [fixture, orphanFixture, dist]) fs.rmSync(dir, { recursive: true, force: true });

console.log(failures ? `\n${failures} failure(s).` : '\n✓ All nesting assertions passed.');
process.exit(failures ? 1 : 0);
