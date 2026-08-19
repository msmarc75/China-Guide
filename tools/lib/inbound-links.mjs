/**
 * One definition of "inbound editorial link", shared by every tool that counts
 * them.
 *
 * WHY THIS MODULE EXISTS
 *
 * There were three copies of this logic. Two agreed; the third did not, and the
 * third was the one wired into `npm test`.
 *
 * `tools/test-linking.mjs` asserted "every article has at least 2 inbound
 * editorial links" while counting something else entirely:
 *
 *   1. It scanned the whole `<main id="main">` rather than the prose region, so
 *      it counted the auto-generated related block, the sidebar aside, the
 *      product and promo slots and the ad slot. Its own comment said "Count
 *      only editorial links: inside <main>" — but <main> is where all the
 *      generated chrome lives, so the comment asserted the opposite of the
 *      behaviour.
 *   2. It did not deduplicate by source page, so two links from one article
 *      counted as two inbound links. Editorially they are one route.
 *   3. It did not normalise trailing slashes on the href, so some links were
 *      silently missed.
 *
 * The visible consequence: /answers/what-plug-adapter-do-i-need-for-china/ had
 * exactly one distinct source article pointing at it — both its links came from
 * the same page — and the suite stayed green for three batches.
 *
 * A count is only worth asserting on if everything asserting on it agrees what
 * is being counted. Hence one implementation, imported everywhere.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Every built HTML file under dist/. */
export function walkHtml(dist, out = []) {
  for (const entry of fs.readdirSync(dist, { withFileTypes: true })) {
    const full = path.join(dist, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (full.endsWith('.html')) out.push(full);
  }
  return out;
}

/** dist/answers/foo/index.html -> /answers/foo/ */
export function urlOf(dist, file) {
  const rel = path.relative(dist, file).replace(/\\/g, '/');
  return rel === 'index.html' ? '/' : `/${rel.replace(/index\.html$/, '')}`;
}

/**
 * The prose region of a page.
 *
 * Everything from <article> up to the related block — which is generated from
 * topic overlap and says nothing about whether a human thought two pages
 * belonged together. Chrome asides are stripped, but `:::warn` / `:::tip` /
 * `:::note` render as <aside class="callout …> and ARE prose a writer chose to
 * put there, so links inside them count.
 */
export function editorialRegion(html) {
  const start = html.indexOf('<article');
  if (start === -1) return '';
  const relatedAt = html.indexOf('<section class="related">', start);
  const end = relatedAt !== -1 ? relatedAt : html.indexOf('</article>', start);
  return html
    .slice(start, end === -1 ? html.length : end)
    .replace(/<aside class="(?:article__aside|product-slot|promo-slot)[\s\S]*?<\/aside>/g, '')
    .replace(/<div class="ad-slot"[\s\S]*?<\/div>/g, '');
}

const isListing = (url) => url === '/' || url === '/sitemap-page/' || /^\/[^/]+\/$/.test(url);

/** A page worth being reachable: content, not chrome or a generated index. */
export const isArticle = (url) =>
  !isListing(url) && !url.endsWith('404.html') && url !== '/search/';

/**
 * Build the inbound link graph.
 *
 * Returns `sources`: target url -> array of DISTINCT source urls that link to
 * it from editorial prose. Distinct is the whole point — two links from one
 * article give a reader one route, not two, so they count once.
 */
export function inboundSources(dist) {
  const files = walkHtml(dist);
  const sources = new Map();
  for (const file of files) {
    const from = urlOf(dist, file);
    if (isListing(from)) continue;
    const region = editorialRegion(fs.readFileSync(file, 'utf8'));
    const seen = new Set();
    for (const m of region.matchAll(/href="(\/[^"#?]*)"/g)) {
      const to = m[1].endsWith('/') ? m[1] : `${m[1]}/`;
      if (to === from || seen.has(to)) continue;
      seen.add(to);
      if (!sources.has(to)) sources.set(to, []);
      sources.get(to).push(from);
    }
  }
  return { files, sources, urls: files.map((f) => urlOf(dist, f)) };
}

/**
 * The cluster a nested page belongs to: /destinations/beijing/restaurants/
 * belongs to /destinations/beijing/. Top-level pages have no cluster.
 *
 * Cluster isolation is invisible to a count. /destinations/beijing/restaurants/
 * sat on the section median with two inbound links, both from its own parent
 * and its own sibling — a reader who never landed on the Beijing city page had
 * no editorial route to it. Eight pages were in that state.
 */
export const clusterOf = (url) => {
  const m = url.match(/^\/([^/]+)\/([^/]+)\/.+/);
  return m ? `/${m[1]}/${m[2]}/` : null;
};

/** Nested pages and how many of their referrers come from outside the cluster. */
export function clusterIsolation(sources, urls) {
  return urls
    .map((url) => {
      const cluster = clusterOf(url);
      if (!cluster || !isArticle(url)) return null;
      const all = sources.get(url) ?? [];
      const outside = all.filter((s) => clusterOf(s) !== cluster && s !== cluster);
      return { url, inbound: all.length, outside };
    })
    .filter(Boolean)
    .sort((a, b) => a.outside.length - b.outside.length || a.inbound - b.inbound);
}
