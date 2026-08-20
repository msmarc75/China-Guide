#!/usr/bin/env node
/**
 * Rasterises src/assets/og-default.svg to src/assets/og-default.png.
 *
 * WHY THIS IS NOT PART OF THE BUILD
 *
 * The repository has zero dependencies and zero devDependencies, and
 * `npm run build` runs on Cloudflare Pages with nothing installed. Making the
 * build rasterise an image would mean shipping a browser or an image library
 * into the deploy, which is a structural change to how this site is
 * published — not a decision to slip into a content pass.
 *
 * So the PNG is generated HERE, once, by hand, and committed as a source
 * asset. `copyAssets()` already copies everything in src/assets/ into dist/,
 * so the build needs no change at all and gains no dependency.
 *
 * Run it again only when the SVG changes:
 *
 *   node tools/make-og-image.mjs
 *
 * It needs Playwright and a Chromium, the same pair `audit:mobile` and
 * `test:visa` already use, and it is the only way to get the SVG's TEXT
 * rendered correctly — a hand-written PNG encoder could draw the gradient and
 * the compass mark, but not type.
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const SRC = 'src/assets/og-default.svg';
const OUT = 'src/assets/og-default.png';
const WIDTH = 1200;
const HEIGHT = 630;

const svg = fs.readFileSync(SRC, 'utf8');

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});

// The SVG is inlined rather than loaded as a file so its fonts resolve against
// the browser's own stacks, exactly as the SVG declares them.
await page.setContent(
  `<!doctype html><meta charset="utf-8">
   <style>html,body{margin:0;padding:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden}
   svg{display:block}</style>${svg}`,
  { waitUntil: 'load' }
);

const buffer = await page.screenshot({
  type: 'png',
  clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
});
await browser.close();

fs.writeFileSync(OUT, buffer);
console.log(`Wrote ${OUT} — ${WIDTH}x${HEIGHT}, ${(buffer.length / 1024).toFixed(1)}KB`);
console.log(`Source: ${path.resolve(SRC)}`);
