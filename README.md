# China Travel Compass

A complete, SEO-optimised English travel guide to China for foreign visitors —
70 pages covering visas, mobile payments, connectivity, high-speed rail, 20+
destinations, itineraries, food and culture.

Built as a **zero-dependency static site**: no framework, no npm install, no
build tooling beyond Node itself. It renders to plain HTML that deploys anywhere.

---

## Quick start

```bash
npm run build     # render the site into dist/
npm run check     # quality gate: links, metadata, structured data
npm run serve     # preview at http://localhost:4321
npm run dev       # build + serve
```

There are no dependencies to install. Node 18+ is the only requirement.

---

## What is in here

| Section | Pages | Covers |
| --- | --- | --- |
| `/plan/` | 6 | First-timer guide, when to go, costs, packing, trip length, mistakes |
| `/guides/` | 8 | Visas, payments, internet & VPN, transport, hotels, safety, shopping, solo travel |
| `/destinations/` | 20 | Beijing, Shanghai, Xi'an, Chengdu, Guilin, Zhangjiajie, Yunnan, Tibet, Hong Kong and more |
| `/culture/` | 6 | Etiquette, Mandarin basics, festivals, history, religion, tea |
| `/itineraries/` | 6 | 7 / 10 / 14 / 21-day routes, Silk Road, southern landscapes |
| `/food/` | 6 | Regional cuisines, how to order, street food, hotpot, vegetarian, drinks |
| `/shop/` | 2 | Digital product pages |
| Site pages | 5 | About, editorial policy, affiliate disclosure, privacy, contact |

Plus a homepage, seven section indexes, a client-side search page, a
human-readable page index, `sitemap.xml`, `robots.txt`, `feed.xml`, a web
manifest and a 404 page.

---

## Architecture

```
src/
├── build.mjs              # the generator — sections, pages, feeds, sitemap
├── check.mjs              # post-build quality gate (exits non-zero on failure)
├── serve.mjs              # local preview server
├── lib/
│   ├── markdown.mjs       # markdown renderer + FAQ extraction + slugs
│   ├── frontmatter.mjs    # YAML-subset front-matter parser
│   ├── templates.mjs      # layout, components, monetisation slots
│   └── seo.mjs            # schema.org builders
├── content/
│   ├── site.mjs           # site config, nav, monetisation partners & products
│   ├── plan/ guides/ destinations/ culture/ itineraries/ food/ shop/ pages/
└── assets/                # CSS, JS, SVG brand assets
```

### Adding a page

Drop a Markdown file into the relevant `src/content/<section>/` directory:

```markdown
---
title: Kunming Travel Guide
navTitle: Kunming
metaTitle: "Kunming Travel Guide: The Spring City"     # optional, overrides <title>
description: One-sentence meta description, 120–160 characters.
standfirst: The opening line shown under the H1.
eyebrow: Destination
order: 21
updated: 2026-08-01
keywords: [kunming travel guide, yunnan]
asidePartner: hotels        # which affiliate slot appears in the sidebar
facts:
  - Days needed | 2 nights
  - Best season | Year-round
related:
  - /destinations/yunnan/
---

## First section

Body content in Markdown.

## Frequently asked questions

### A question?

An answer. This section is auto-extracted into FAQPage structured data.
```

The URL, breadcrumbs, table of contents, structured data, sitemap entry, RSS
item and search index entry are all derived automatically.

### Markdown extensions

Beyond standard Markdown:

- `:::tip` / `:::warn` / `:::key` / `:::money` / `:::local` — editorial callouts
- `:::slot partner:esim` — inserts a monetisation slot inline
- `:::slot product:planner`, `:::slot ad:mid-article`, `:::slot newsletter`
- Tables, blockquotes, fenced code and auto-anchored headings

---

## Configuration

Everything commercial and identity-related lives in `src/content/site.mjs`.

| What | Where |
| --- | --- |
| Site name, description, canonical URL | `SITE` |
| Navigation and footer | `NAV`, `FOOTER_LINKS` |
| Affiliate partners | `MONETISATION.partners` — set `enabled: true` and add the URL |
| Digital products | `MONETISATION.products` |
| Newsletter endpoint | `MONETISATION.newsletter.action` |

Environment variables, all optional:

```bash
SITE_URL=https://yourdomain.com   # canonical origin (default: chinatravelcompass.com)
ANALYTICS_ID=G-XXXXXXXXXX         # emits GA4 tags when set
ADSENSE_ID=ca-pub-XXXXXXXX        # emits real ad units instead of placeholders
```

---

## SEO features

- Canonical URLs, robots directives, Open Graph and Twitter cards on every page
- `Article`, `FAQPage`, `BreadcrumbList`, `TouristDestination`, `ItemList`,
  `Organization` and `WebSite` structured data
- Auto-generated `sitemap.xml` with per-section priorities and `lastmod`
- RSS feed, web manifest, human-readable page index at `/sitemap-page/`
- One `H1` per page, semantic headings, auto-anchored sections, table of contents
- Client-side search with a pre-built index — no server, works offline once loaded
- `robots.txt` explicitly allowing AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
- Static HTML, no framework, no render-blocking JavaScript
- `npm run check` fails the build on broken internal links, missing or
  oversized metadata, duplicate titles, multiple `H1`s or invalid JSON-LD

---

## Monetisation

See **[MONETIZATION.md](MONETIZATION.md)** for the full strategy: revenue
streams in priority order, realistic revenue projections, which pages to
monetise first, and an activation checklist.

In short: affiliate commission on hotels, tours, eSIMs, rail and insurance as
the primary stream; two first-party digital products as the highest-margin
layer; an email list as the multiplier; and display advertising only once
traffic justifies it. All the slots exist in the code and ship disabled.

---

## Deployment

The site is static, so anything that serves files works. A GitHub Pages workflow
is included at `.github/workflows/deploy.yml`.

**GitHub Pages** — enable Pages with "GitHub Actions" as the source, set the
`SITE_URL` repository variable, and push to the default branch.

**Netlify / Vercel / Cloudflare Pages** — build command `npm run build`, publish
directory `dist`.

**Any static host** — run `npm run build` and upload `dist/`.

---

## Content accuracy

China's entry rules, prices and ticketing systems change frequently. Every page
carries an `updated` date, and the [editorial policy](src/content/pages/editorial-policy.md)
commits to quarterly review of the entry, payment and connectivity guides.

Guidance on visas and visa-free entry describes the schemes as they stood at the
last update and tells readers to confirm with their local Chinese embassy before
booking — because the lists have been revised roughly every six months since
2023 and carry expiry dates.

---

## Licence

MIT for the code. Content is © China Travel Compass.
