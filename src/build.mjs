#!/usr/bin/env node
/**
 * Static site generator for China Trip Compass.
 *
 * Reads Markdown + front matter from src/content/<section>/, renders every page
 * with SEO metadata and structured data, then writes sitemap, RSS feed, search
 * index and assets into dist/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFrontmatter } from './lib/frontmatter.mjs';
import { renderMarkdown, toPlainText, extractFaq, escapeHtml } from './lib/markdown.mjs';
import {
  layout,
  tableOfContents,
  cardGrid,
  relatedBlock,
  slotRenderer,
  newsletterBlock,
  adSlot,
  partnerSlot,
  productSlot,
} from './lib/templates.mjs';
import {
  graph,
  organisationSchema,
  websiteSchema,
  breadcrumbSchema,
  articleSchema,
  faqSchema,
  qaPageSchema,
  destinationSchema,
  itemListSchema,
  abs,
} from './lib/seo.mjs';
import { SITE } from './content/site.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// CONTENT_DIR / DIST_DIR let the generator run against fixture content in tests.
const CONTENT = process.env.CONTENT_DIR ? path.resolve(process.env.CONTENT_DIR) : path.join(__dirname, 'content');
const ASSETS = path.join(__dirname, 'assets');
const DIST = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.join(ROOT, 'dist');

/** Section registry — order drives navigation and the sitemap priority. */
const SECTIONS = [
  {
    id: 'plan',
    title: 'Plan Your Trip to China',
    heading: 'Planning a trip to China',
    description:
      'Everything you decide before you book: when to go, what a China trip really costs, how long you need, what to pack and how to build a route that works.',
    intro:
      'China rewards planning more than almost any destination on earth. Entry rules changed twice in the last two years, the payment system runs on apps rather than cards, and the country is the size of a continent. These guides get the big decisions right before you spend money.',
    priority: 0.9,
  },
  {
    id: 'guides',
    title: 'Practical China Travel Guides',
    heading: 'Practical guides',
    description:
      'The mechanics of travelling in China: visas and visa-free entry, mobile payments, SIM cards, VPNs, high-speed rail, hotels and health advice.',
    intro:
      'These are the pages you will actually open while you are in China. Each one is written from the perspective of a foreign passport holder with a foreign phone number and a foreign bank card — the three things that make China different.',
    priority: 0.9,
  },
  {
    id: 'destinations',
    title: 'China Destinations',
    heading: 'Where to go in China',
    description:
      'City and region guides to China for foreign travellers: Beijing, Shanghai, Xi’an, Chengdu, Guilin, Yunnan, Hong Kong and 20 more destinations.',
    intro:
      'China has 22 provinces, five autonomous regions and four direct-administered municipalities. You will not see them all. These guides tell you what each place is genuinely good at, how many days it deserves and how to reach the next stop.',
    priority: 0.9,
  },
  {
    id: 'culture',
    title: 'Chinese Culture & Etiquette',
    heading: 'Culture, etiquette & history',
    description:
      'Understand Chinese culture before you arrive: etiquette and face, festivals, religion, tea culture, history and the language basics that help.',
    intro:
      'Travelling well in China is mostly about reading the room. This section covers the cultural logic behind what you will see — why people queue the way they do, why the banquet has rules, and what 3,000 years of history left on the ground.',
    priority: 0.8,
  },
  {
    id: 'itineraries',
    title: 'China Itineraries',
    heading: 'Ready-made China itineraries',
    description:
      'Tested China itineraries for 7, 10, 14 and 21 days, plus themed routes — classic highlights, Silk Road, southern karst landscapes and a food-first loop.',
    intro:
      'Each itinerary below is built around real high-speed rail times, realistic opening hours and a sane pace. Take one as written, or use it as a skeleton and swap in the cities you care about.',
    priority: 0.8,
  },
  {
    id: 'food',
    title: 'Chinese Food & Drink Guide',
    heading: 'Food & drink',
    description:
      'A regional guide to Chinese food for travellers: the eight great cuisines, what to order and how, street food, hotpot, drinks and vegetarian tips.',
    intro:
      '"Chinese food" is not a cuisine — it is a dozen of them, and the version you know abroad is mostly Cantonese filtered through emigration. This section maps the real thing region by region and tells you exactly what to say to get it.',
    priority: 0.8,
  },
  {
    id: 'answers',
    title: 'China Travel Questions Answered',
    heading: 'Answers',
    description:
      'Short, direct answers to the questions foreign visitors actually ask about travelling in China — one question per page, no preamble.',
    intro:
      'One question, one page, answered in the first two sentences. These are the things people search three days before flying.',
    priority: 0.7,
  },
  {
    id: 'shop',
    title: 'China Travel Resources & Downloads',
    heading: 'Resources & downloads',
    description:
      'Downloadable planners, offline phrase packs and checklists that make a China trip easier — built by the team behind China Trip Compass.',
    intro:
      'Free guides pay the bills through affiliate links; these paid resources are how we keep the free guides free and independent of any tour operator.',
    priority: 0.5,
  },
];

const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

/* ------------------------------------------------------------------ *
 * Content loading
 * ------------------------------------------------------------------ */

/**
 * Loads a section's Markdown, descending into subdirectories.
 *
 * A subdirectory produces nested URLs: `destinations/beijing/restaurants.md`
 * becomes `/destinations/beijing/restaurants/`. The pillar page for that folder
 * is its sibling file, `destinations/beijing.md` — so adding children never
 * requires moving an existing page.
 */
function readContentDir(sectionId) {
  const root = path.join(CONTENT, sectionId);
  if (!fs.existsSync(root)) return [];
  const isStandalone = sectionId === 'pages';
  const pages = [];

  const urlFor = (segments) =>
    isStandalone ? `/${segments.join('/')}/` : `/${sectionId}/${segments.join('/')}/`;

  const walk = (dir, prefix) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, [...prefix, entry.name]);
        continue;
      }
      if (!entry.name.endsWith('.md')) continue;

      const slug = entry.name.replace(/\.md$/, '');
      const segments = [...prefix, slug];
      const { data, body } = parseFrontmatter(fs.readFileSync(full, 'utf8'));

      pages.push({
        ...data,
        slug,
        segments,
        depth: segments.length,
        parentUrl: segments.length > 1 ? urlFor(segments.slice(0, -1)) : null,
        section: isStandalone ? 'page' : sectionId,
        sectionId,
        url: urlFor(segments),
        body,
        title: data.title || slug,
        description: data.description || toPlainText(body, 155),
        keywords: Array.isArray(data.keywords) ? data.keywords : data.keywords ? [data.keywords] : [],
        updated: data.updated || new Date().toISOString().slice(0, 10),
        order: typeof data.order === 'number' ? data.order : 999,
      });
    }
  };

  walk(root, []);
  return pages.sort(
    (a, b) => a.depth - b.depth || a.order - b.order || a.title.localeCompare(b.title)
  );
}

const pagesBySection = {};
for (const section of SECTIONS) pagesBySection[section.id] = readContentDir(section.id);
const standalonePages = readContentDir('pages');
const allArticles = SECTIONS.flatMap((s) => pagesBySection[s.id]);

/**
 * A child page whose pillar is missing would emit a breadcrumb pointing at a
 * 404, which is invisible until someone clicks it. Fail the build instead.
 */
for (const page of [...allArticles, ...standalonePages]) {
  if (!page.parentUrl) continue;
  const exists =
    allArticles.some((p) => p.url === page.parentUrl) ||
    standalonePages.some((p) => p.url === page.parentUrl);
  if (!exists) {
    throw new Error(
      `Missing pillar page for ${page.url}\n` +
        `  Create src/content/${page.sectionId}/${page.segments.slice(0, -1).join('/')}.md ` +
        `so that ${page.parentUrl} exists.`
    );
  }
}

/** Direct children of a page, used to turn pillar pages into hubs. */
const childrenOf = (page) =>
  allArticles
    .filter((p) => p.parentUrl === page.url)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function write(relPath, contents) {
  const target = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function writePage(url, html) {
  const rel = url === '/' ? 'index.html' : path.join(url.replace(/^\/|\/$/g, ''), 'index.html');
  write(rel, html);
}

function excerptOf(page) {
  return page.excerpt || toPlainText(page.body, 140);
}

/**
 * Words that appear in almost every page on a China travel site. Left in, they
 * would make every page equally related to every other, which is the same as
 * having no relatedness signal at all.
 */
const LINK_STOPWORDS = new Set([
  'china', 'chinese', 'travel', 'travelling', 'traveling', 'guide', 'trip', 'tips',
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'you', 'your', 'are', 'can',
  'how', 'what', 'when', 'where', 'why', 'best', 'need', 'know', 'about', 'into',
]);

const tokenise = (text = '') =>
  String(text)
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length > 2 && !LINK_STOPWORDS.has(w));

/**
 * Picks related pages by keyword and structural affinity.
 *
 * Hand-maintained `related` lists do not survive a few hundred pages, so they
 * are treated as pins that come first, and the remainder is computed.
 */
const RELATED_COUNT = 4;

function resolveRelated(page) {
  const explicit = (page.related || [])
    .map((url) => allArticles.find((p) => p.url === url) || standalonePages.find((p) => p.url === url))
    .filter(Boolean);

  const taken = new Set([page.url, ...explicit.map((p) => p.url)]);
  const myKeywords = new Set((page.keywords || []).map((k) => String(k).toLowerCase()));
  const myWords = new Set([
    ...tokenise(page.title),
    ...(page.keywords || []).flatMap((k) => tokenise(k)),
  ]);

  const scored = [...allArticles, ...standalonePages]
    .filter((candidate) => !taken.has(candidate.url))
    .map((candidate) => {
      let score = 0;

      // Whole keyword in common — the strongest signal available.
      for (const k of candidate.keywords || []) {
        if (myKeywords.has(String(k).toLowerCase())) score += 10;
      }

      // Individual meaningful words in common.
      const theirWords = new Set([
        ...tokenise(candidate.title),
        ...(candidate.keywords || []).flatMap((k) => tokenise(k)),
      ]);
      for (const word of myWords) if (theirWords.has(word)) score += 2;

      // Structural affinity: parent, child, sibling, same section.
      if (candidate.parentUrl && candidate.parentUrl === page.url) score += 8;
      if (page.parentUrl && page.parentUrl === candidate.url) score += 8;
      if (page.parentUrl && candidate.parentUrl === page.parentUrl) score += 5;
      if (candidate.sectionId === page.sectionId) score += 3;

      return { page: candidate, score };
    })
    .filter((r) => r.score > 0)
    // Title tie-break keeps the output deterministic across builds.
    .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title));

  return { explicit, scored };
}

/**
 * Related links for every page, computed once.
 *
 * Scoring alone leaves a tail of pages that never appear in anyone's list —
 * Harbin, for instance, shares little vocabulary with the rest of the site. A
 * page nothing links to is discovered late and ranks poorly, so a second pass
 * guarantees every page a minimum number of inbound editorial links by placing
 * it on the list where it scored highest.
 */
const MIN_INBOUND = 2;

const RELATED = (() => {
  const everything = [...allArticles, ...standalonePages];
  const ranked = new Map(everything.map((p) => [p.url, resolveRelated(p)]));
  const lists = new Map(
    everything.map((p) => {
      const { explicit, scored } = ranked.get(p.url);
      return [p.url, [...explicit, ...scored.map((r) => r.page)].slice(0, RELATED_COUNT)];
    })
  );

  const inbound = new Map(everything.map((p) => [p.url, 0]));
  for (const list of lists.values()) {
    for (const target of list) inbound.set(target.url, (inbound.get(target.url) || 0) + 1);
  }

  for (const target of everything) {
    while ((inbound.get(target.url) || 0) < MIN_INBOUND) {
      // Where does this page rank highest among lists that do not already carry it?
      let best = null;
      for (const source of everything) {
        if (source.url === target.url) continue;
        const list = lists.get(source.url);
        // Append rather than replace: replacing would silently cost the
        // displaced page an inbound link and leave the accounting wrong.
        if (list.length >= RELATED_COUNT + 2) continue;
        if (list.some((p) => p.url === target.url)) continue;
        const hit = ranked.get(source.url).scored.find((r) => r.page.url === target.url);
        if (hit && (!best || hit.score > best.score)) best = { source, score: hit.score };
      }
      if (!best) break; // genuinely unrelatable — the check will flag it

      lists.get(best.source.url).push(target);
      inbound.set(target.url, (inbound.get(target.url) || 0) + 1);
    }
  }

  return lists;
})();

function crumbsFor(page) {
  const crumbs = [{ label: 'Home', href: '/' }];
  const section = SECTION_BY_ID[page.sectionId];
  if (section) crumbs.push({ label: section.heading, href: `/${section.id}/` });

  // Nested pages get one crumb per ancestor: Home > Destinations > Beijing > Restaurants
  for (let i = 1; i < (page.segments?.length || 1); i++) {
    const url = `/${page.sectionId}/${page.segments.slice(0, i).join('/')}/`;
    const ancestor = allArticles.find((p) => p.url === url);
    if (ancestor) crumbs.push({ label: ancestor.navTitle || ancestor.title, href: url });
  }

  crumbs.push({ label: page.navTitle || page.title, href: page.url });
  return crumbs;
}

/* ------------------------------------------------------------------ *
 * Article rendering
 * ------------------------------------------------------------------ */

/**
 * The accepted answer for an /answers/ page: standfirst plus opening paragraph.
 * Both sit above the fold, which is what a search snippet extracts.
 */
function directAnswerOf(page) {
  const firstParagraph = page.body
    .split('\n\n')
    .map((b) => b.trim())
    .find((b) => b && !/^[#:|>-]/.test(b));
  return toPlainText([page.standfirst, firstParagraph].filter(Boolean).join(' '));
}

function renderArticle(page) {
  const { html, headings } = renderMarkdown(page.body, { slotRenderer });
  const faqs = extractFaq(page.body);
  const crumbs = crumbsFor(page);
  const related = RELATED.get(page.url) || [];
  const children = childrenOf(page);
  const childHub = children.length
    ? `<nav class="child-hub" aria-label="In this guide">
      <p class="child-hub__title">${escapeHtml(page.navTitle || page.title)} in detail</p>
      ${cardGrid(
        children.map((c) => ({
          title: c.navTitle || c.title,
          url: c.url,
          excerpt: excerptOf(c),
        }))
      )}
    </nav>`
    : '';
  const words = toPlainText(page.body).split(/\s+/).length;
  const readingTime = Math.max(2, Math.round(words / 220));

  const schemaNodes = [
    organisationSchema(),
    websiteSchema(),
    breadcrumbSchema(crumbs),
    articleSchema(page),
    faqs.length ? faqSchema(faqs) : null,
    page.sectionId === 'destinations' ? destinationSchema(page) : null,
    page.sectionId === 'answers' ? qaPageSchema(page, directAnswerOf(page)) : null,
  ];

  const facts = Array.isArray(page.facts) && page.facts.length
    ? `<dl class="fact-box">${page.facts
        .map((f) => {
          const [label, ...rest] = String(f).split('|');
          return `<div><dt>${escapeHtml(label.trim())}</dt><dd>${escapeHtml(rest.join('|').trim())}</dd></div>`;
        })
        .join('')}</dl>`
    : '';

  const body = `<article class="article" itemscope itemtype="https://schema.org/Article">
  <div class="wrap wrap--article">
    <header class="article__header">
      ${page.eyebrow ? `<p class="eyebrow">${escapeHtml(page.eyebrow)}</p>` : ''}
      <h1 itemprop="headline">${escapeHtml(page.title)}</h1>
      <p class="article__standfirst">${escapeHtml(page.standfirst || page.description)}</p>
      <p class="article__meta">
        <time datetime="${page.updated}">Updated ${escapeHtml(page.updated)}</time>
        <span aria-hidden="true">·</span>
        <span>${readingTime} min read</span>
        <span aria-hidden="true">·</span>
        <span>${escapeHtml(page.author || 'China Trip Compass editors')}</span>
      </p>
    </header>
    ${facts}
    ${childHub}
    <div class="article__layout">
      <div class="article__body" itemprop="articleBody">
        ${tableOfContents(headings)}
        ${html}
      </div>
      <aside class="article__aside">
        ${partnerSlot(page.asidePartner || 'tours', { compact: true })}
        ${productSlot('planner')}
        ${adSlot('sidebar')}
      </aside>
    </div>
    ${relatedBlock(related)}
  </div>
</article>
${newsletterBlock()}`;

  return layout(
    {
      ...page,
      type: 'article',
      crumbs,
      schema: graph(schemaNodes),
    },
    body
  );
}

/* ------------------------------------------------------------------ *
 * Section index pages
 * ------------------------------------------------------------------ */

function renderSectionIndex(section) {
  // Pillars only. Children are surfaced on their pillar page, which keeps the
  // hierarchy legible to readers and to search engines.
  const pages = pagesBySection[section.id].filter((p) => p.depth === 1);
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: section.heading, href: `/${section.id}/` },
  ];
  const items = pages.map((p) => ({
    title: p.navTitle || p.title,
    url: p.url,
    excerpt: excerptOf(p),
    badge: p.badge,
    meta: p.readTime,
  }));

  const body = `<div class="wrap">
  <header class="page-header">
    <h1>${escapeHtml(section.heading)}</h1>
    <p class="page-header__lede">${escapeHtml(section.intro)}</p>
  </header>
  ${cardGrid(items)}
  ${adSlot('section-footer')}
</div>
${newsletterBlock()}`;

  return layout(
    {
      title: section.title,
      metaTitle: `${section.title} (2026) | ${SITE.name}`,
      description: section.description,
      url: `/${section.id}/`,
      section: section.id,
      crumbs,
      schema: graph([
        organisationSchema(),
        websiteSchema(),
        breadcrumbSchema(crumbs),
        itemListSchema(items, section.title),
      ]),
    },
    body
  );
}

/* ------------------------------------------------------------------ *
 * Home page
 * ------------------------------------------------------------------ */

function renderHome() {
  const pick = (sectionId, slugs) =>
    slugs
      .map((slug) => pagesBySection[sectionId].find((p) => p.slug === slug))
      .filter(Boolean)
      .map((p) => ({ title: p.navTitle || p.title, url: p.url, excerpt: excerptOf(p) }));

  const essentials = pick('guides', [
    'china-visa-guide',
    'money-and-payments-in-china',
    'internet-vpn-apps-china',
    'transport-in-china',
    'accommodation-in-china',
    'health-and-safety-in-china',
  ]);

  const cities = pick('destinations', [
    'beijing',
    'shanghai',
    'xian',
    'chengdu',
    'guilin-yangshuo',
    'zhangjiajie',
  ]);

  const planning = pick('plan', [
    'first-time-china-travel-guide',
    'best-time-to-visit-china',
    'china-trip-cost-budget',
    'china-packing-list',
  ]);

  const itineraries = pagesBySection.itineraries.slice(0, 4).map((p) => ({
    title: p.navTitle || p.title,
    url: p.url,
    excerpt: excerptOf(p),
  }));

  const body = `<section class="hero">
  <div class="wrap hero__inner">
    <p class="hero__eyebrow">Independent · Updated for 2026 travel</p>
    <h1>The complete China travel guide for foreign visitors</h1>
    <p class="hero__lede">China reopened to independent travellers with visa-free entry for dozens of nationalities, a
    cashless payment system that finally accepts foreign cards, and the largest high-speed rail network on the planet.
    This guide covers all of it — entry rules, payments, trains, food, etiquette and 20+ destinations — in plain English,
    written for people who do not read Chinese.</p>
    <div class="hero__actions">
      <a class="btn btn--primary btn--lg" href="/plan/first-time-china-travel-guide/">Start with the first-timer guide</a>
      <a class="btn btn--ghost btn--lg" href="/itineraries/">Browse itineraries</a>
    </div>
    <ul class="hero__stats">
      <li><strong>240 h</strong><span>visa-free transit at 60+ ports</span></li>
      <li><strong>48,000 km</strong><span>of high-speed rail</span></li>
      <li><strong>60</strong><span>UNESCO World Heritage sites</span></li>
      <li><strong>8</strong><span>great regional cuisines</span></li>
    </ul>
  </div>
</section>

<section class="wrap home-section">
  <header class="section-header">
    <h2>Start here: the things that trip people up</h2>
    <p>If you read nothing else, read these. They are the difference between a smooth trip and standing outside a hotel at midnight with a card nobody can process.</p>
  </header>
  ${cardGrid(essentials.slice(0, 6))}
</section>

${adSlot('home-mid')}

<section class="wrap home-section">
  <header class="section-header">
    <h2>Plan the trip</h2>
    <p>Timing, budget, route length and packing — the decisions you make before you spend anything.</p>
  </header>
  ${cardGrid(planning)}
</section>

<section class="wrap home-section">
  <header class="section-header">
    <h2>Where to go</h2>
    <p>Twenty-plus destination guides, each with a realistic number of days, the best season, and how to get to the next stop by train.</p>
    <p><a class="link-more" href="/destinations/">See all destinations →</a></p>
  </header>
  ${cardGrid(cities)}
</section>

<section class="wrap home-section">
  <header class="section-header">
    <h2>Ready-made routes</h2>
    <p>Day-by-day itineraries built on real train times, from a one-week first trip to a three-week Silk Road run.</p>
  </header>
  ${cardGrid(itineraries)}
</section>

<section class="wrap home-section home-section--why">
  <div class="prose-wide">
    <h2>Why China is different from anywhere else you have travelled</h2>
    <p>Most travel advice assumes three things: that your credit card works, that Google Maps knows where you are, and
    that English signage will save you. In mainland China, all three assumptions fail at once — and every one of them has
    a straightforward fix that takes ten minutes to set up before you fly.</p>
    <p>The payment system is the clearest example. China skipped credit cards and went straight from cash to QR codes.
    Roughly nine in ten urban transactions now run through <a href="/guides/money-and-payments-in-china/">Alipay or
    WeChat Pay</a>. Since 2023 both apps accept foreign Visa and Mastercard, which means a visitor can pay like a local —
    but only if the app is installed, verified with a passport and linked to a card <em>before</em> arrival, because the
    verification step can require an SMS code sent to a working number.</p>
    <p>The internet is the second. Google, WhatsApp, Instagram, Facebook, X and most Western news sites are unreachable
    on a mainland connection. A foreign SIM roaming into China usually routes traffic back through its home network and
    reaches everything normally; a Chinese SIM does not. That single technical detail decides
    <a href="/guides/internet-vpn-apps-china/">how you should handle connectivity</a>.</p>
    <p>The third is scale. Beijing to Guangzhou is 2,300 km — roughly Madrid to Warsaw. The high-speed rail network
    makes that a comfortable eight-hour ride at 350 km/h, and understanding
    <a href="/guides/transport-in-china/">how to book and use it</a> is what turns a scattered list of cities into an
    actual route.</p>
    <p>None of this is hard. It is just unfamiliar, and almost nothing you learned travelling elsewhere transfers
    directly. That is what this guide is for.</p>
  </div>
</section>

${newsletterBlock()}`;

  return layout(
    {
      title: `${SITE.name} — ${SITE.tagline}`,
      metaTitle: 'China Travel Guide 2026: Visas, Costs & Itineraries',
      description:
        'The complete China travel guide for foreigners: 2026 visa rules, mobile payments, VPNs, high-speed rail, 20+ city guides, itineraries and food.',
      url: '/',
      section: 'home',
      bodyClass: 'is-home',
      keywords: [
        'china travel guide',
        'travel to china',
        'china visa free',
        'china itinerary',
        'visiting china as a foreigner',
      ],
      schema: graph([
        organisationSchema(),
        websiteSchema(),
        itemListSchema([...essentials, ...cities], 'China travel essentials'),
      ]),
    },
    body
  );
}

/* ------------------------------------------------------------------ *
 * Utility pages
 * ------------------------------------------------------------------ */

function renderSearchPage(index) {
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Search', href: '/search/' },
  ];
  const body = `<div class="wrap wrap--article">
  <header class="page-header">
    <h1>Search the guide</h1>
    <p class="page-header__lede">Every page on China Trip Compass, searchable offline once loaded.</p>
  </header>
  <form class="search-page__form" role="search" onsubmit="return false;">
    <label class="sr-only" for="search-input">Search</label>
    <input id="search-input" type="search" placeholder="visa, Alipay, Great Wall, hotpot…" autofocus>
  </form>
  <div id="search-results" class="search-page__results"></div>
  <noscript><p>Search needs JavaScript. Use the <a href="/sitemap-page/">page index</a> instead.</p></noscript>
</div>`;
  return layout(
    {
      title: 'Search',
      description: 'Search every China travel guide on China Trip Compass.',
      url: '/search/',
      noindex: true,
      crumbs,
      schema: graph([organisationSchema(), websiteSchema(), breadcrumbSchema(crumbs)]),
    },
    body
  );
}

function renderSitemapPage() {
  const groups = SECTIONS.map(
    (s) => `<section class="sitemap-group">
    <h2><a href="/${s.id}/">${escapeHtml(s.heading)}</a></h2>
    <ul>${pagesBySection[s.id]
      .filter((p) => p.depth === 1)
      .map((p) => {
        const kids = childrenOf(p);
        const nested = kids.length
          ? `<ul>${kids.map((c) => `<li><a href="${c.url}">${escapeHtml(c.title)}</a></li>`).join('')}</ul>`
          : '';
        return `<li><a href="${p.url}">${escapeHtml(p.title)}</a>${nested}</li>`;
      })
      .join('')}</ul>
  </section>`
  ).join('');

  const extras = `<section class="sitemap-group">
    <h2>Site pages</h2>
    <ul>${standalonePages.map((p) => `<li><a href="${p.url}">${escapeHtml(p.title)}</a></li>`).join('')}</ul>
  </section>`;

  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'All pages', href: '/sitemap-page/' },
  ];

  const body = `<div class="wrap">
  <header class="page-header">
    <h1>Every page on China Trip Compass</h1>
    <p class="page-header__lede">A full human-readable index of the guide — ${allArticles.length + standalonePages.length} pages.</p>
  </header>
  <div class="sitemap-grid">${groups}${extras}</div>
</div>`;

  return layout(
    {
      title: 'All pages',
      description: 'Complete index of every China travel guide, destination and itinerary on China Trip Compass.',
      url: '/sitemap-page/',
      crumbs,
      schema: graph([organisationSchema(), websiteSchema(), breadcrumbSchema(crumbs)]),
    },
    body
  );
}

function render404() {
  const body = `<div class="wrap wrap--article error-page">
  <h1>迷路了 — that page took a wrong turn</h1>
  <p>The page you asked for does not exist. It may have moved when we reorganised the guide.</p>
  <p><a class="btn btn--primary" href="/">Back to the homepage</a> <a class="btn btn--ghost" href="/sitemap-page/">See every page</a></p>
</div>`;
  return layout(
    { title: 'Page not found', description: 'Page not found.', url: '/404.html', noindex: true },
    body
  );
}

/* ------------------------------------------------------------------ *
 * Feeds and machine files
 * ------------------------------------------------------------------ */

function renderSitemapXml() {
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    ...SECTIONS.map((s) => ({ loc: `/${s.id}/`, priority: String(s.priority), changefreq: 'weekly' })),
    ...allArticles.map((p) => ({
      loc: p.url,
      priority: p.priority ? String(p.priority) : p.depth > 1 ? '0.7' : '0.8',
      changefreq: 'monthly',
      lastmod: p.updated,
    })),
    ...standalonePages.map((p) => ({ loc: p.url, priority: '0.4', changefreq: 'yearly', lastmod: p.updated })),
    { loc: '/sitemap-page/', priority: '0.3', changefreq: 'weekly' },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${abs(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
}

function renderRobots() {
  return `User-agent: *
Allow: /
Disallow: /search/

# AI crawlers are welcome to read and cite the guide.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${SITE.url}/sitemap.xml
`;
}

function renderFeed() {
  const recent = [...allArticles]
    .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
    .slice(0, 30);
  const items = recent
    .map(
      (p) => `  <item>
    <title>${escapeHtml(p.title)}</title>
    <link>${abs(p.url)}</link>
    <guid isPermaLink="true">${abs(p.url)}</guid>
    <pubDate>${new Date(`${p.updated}T09:00:00Z`).toUTCString()}</pubDate>
    <description>${escapeHtml(p.description)}</description>
  </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeHtml(SITE.name)}</title>
  <link>${SITE.url}/</link>
  <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>${escapeHtml(SITE.description)}</description>
  <language>en</language>
${items}
</channel>
</rss>
`;
}

/**
 * Cloudflare Pages reads `_headers` and `_redirects` from the build output.
 * Both are ignored by other hosts, so they are safe to emit unconditionally.
 */
function renderHeaders() {
  return `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

# Fingerprint-free assets: short cache, revalidated.
/assets/*
  Cache-Control: public, max-age=3600, must-revalidate

/search-index.json
  Cache-Control: public, max-age=3600, must-revalidate

/sitemap.xml
  Cache-Control: public, max-age=3600

/feed.xml
  Cache-Control: public, max-age=3600
`;
}

function renderRedirects() {
  // Trailing-slash canonicalisation: /guides/china-visa-guide -> /guides/china-visa-guide/
  const paths = [
    ...SECTIONS.map((s) => `/${s.id}`),
    ...allArticles.map((p) => p.url.replace(/\/$/, '')),
    ...standalonePages.map((p) => p.url.replace(/\/$/, '')),
    '/search',
    '/sitemap-page',
  ];
  return `${paths.map((p) => `${p} ${p}/ 301`).join('\n')}\n`;
}

function renderManifest() {
  return JSON.stringify(
    {
      name: SITE.name,
      short_name: SITE.shortName,
      description: SITE.description,
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: SITE.themeColor,
      icons: [{ src: '/assets/logo.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
    null,
    2
  );
}

function renderSearchIndex() {
  const docs = [...allArticles, ...standalonePages].map((p) => ({
    t: p.title,
    u: p.url,
    d: p.description,
    s: SECTION_BY_ID[p.sectionId]?.heading || 'Site',
    k: [...(p.keywords || []), toPlainText(p.body, 600)].join(' ').toLowerCase(),
  }));
  return JSON.stringify(docs);
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

function copyAssets() {
  const target = path.join(DIST, 'assets');
  fs.mkdirSync(target, { recursive: true });
  for (const file of fs.readdirSync(ASSETS)) {
    fs.copyFileSync(path.join(ASSETS, file), path.join(target, file));
  }
}

function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  writePage('/', renderHome());

  for (const section of SECTIONS) {
    writePage(`/${section.id}/`, renderSectionIndex(section));
    for (const page of pagesBySection[section.id]) {
      writePage(page.url, renderArticle(page));
    }
  }

  for (const page of standalonePages) {
    writePage(page.url, renderArticle({ ...page, sectionId: null }));
  }

  writePage('/search/', renderSearchPage());
  writePage('/sitemap-page/', renderSitemapPage());
  write('404.html', render404());
  write('sitemap.xml', renderSitemapXml());
  write('robots.txt', renderRobots());
  write('feed.xml', renderFeed());
  write('site.webmanifest', renderManifest());
  write('search-index.json', renderSearchIndex());
  write('_headers', renderHeaders());
  write('_redirects', renderRedirects());
  write('.nojekyll', '');
  copyAssets();

  const total = allArticles.length + standalonePages.length + SECTIONS.length + 3;
  console.log(`✓ Built ${total} pages into dist/`);
  console.log(`  ${allArticles.length} articles · ${SECTIONS.length} section indexes · ${standalonePages.length} site pages`);
  console.log(`  Canonical origin: ${SITE.url}`);
}

build();
