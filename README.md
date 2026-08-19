# China Trip Compass

A complete, SEO-optimised English travel guide to China for foreign visitors —
70 pages covering visas, mobile payments, connectivity, high-speed rail, 20+
destinations, itineraries, food and culture.

Built as a **zero-dependency static site**: no framework, no npm install, no
build tooling beyond Node itself. It renders to plain HTML that deploys anywhere.

---

## Quick start

```bash
npm run build          # render the site into dist/
npm run check          # quality gate: links, metadata, structured data
npm run test           # generator test suite (nested URLs, orphan guard)
npm run serve          # preview at http://localhost:4321
npm run dev            # build + serve
npm run audit:mobile   # horizontal-overflow audit at phone widths (needs playwright)
```

`build`, `check` and `test` have no dependencies — Node 18+ is the only
requirement. `audit:mobile` is the exception and installs Playwright ad hoc; see
the header of `tools/mobile-audit.mjs`. Set `CHROMIUM_PATH` to reuse a browser
already present on the machine.

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

### Nested pages

A subdirectory produces nested URLs. The pillar page for a folder is its
**sibling file**, so adding children never means moving an existing page:

```
src/content/destinations/
├── beijing.md              → /destinations/beijing/            (pillar)
└── beijing/
    ├── restaurants.md      → /destinations/beijing/restaurants/
    └── things-to-do.md     → /destinations/beijing/things-to-do/
```

What follows automatically:

- Breadcrumbs gain one level per ancestor — `Home › Destinations › Beijing › Restaurants`
- The pillar page renders a hub linking to its children
- Section indexes (`/destinations/`) list **pillars only**, keeping the
  hierarchy legible; children are reached through their pillar
- Nested pages get sitemap priority `0.7` against `0.8` for pillars
- A child whose pillar file is missing **fails the build**, naming the file to
  create, rather than shipping a breadcrumb that 404s

`npm run test` covers all of the above against fixture content.

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
SITE_URL=https://yourdomain.com   # canonical origin (default: chinatripcompass.com)
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

The site is static, so anything that serves files works. **Cloudflare Pages is
the recommended host**: free for this kind of site, global CDN, automatic HTTPS,
and it rebuilds on every push.

### Cloudflare Pages (recommended)

1. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to
   Git**, and select this repository.
2. Build settings:
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** read automatically from `.node-version` (20)
3. Environment variables (Settings → Environment variables), all optional but
   `SITE_URL` matters — it sets canonical URLs, the sitemap and Open Graph tags:
   ```
   SITE_URL=https://yourdomain.com
   ANALYTICS_ID=…        # only if using GA4
   ADSENSE_ID=…          # only once ads are switched on
   ```
4. Deploy. You get a `*.pages.dev` URL immediately.

### Custom domain

If the domain is registered with **Cloudflare Registrar**, DNS is already in
your account and the connection takes one step:

1. Pages project → **Custom domains → Set up a custom domain**
2. Enter the apex (`yourdomain.com`) and add `www` as a second custom domain if
   you want it. Cloudflare creates the DNS records and issues the certificate
   automatically — no manual CNAME needed.
3. Pick one hostname as canonical and redirect the other (Rules → Redirect
   Rules), so search engines see a single version.
4. Set `SITE_URL` to that canonical hostname and redeploy, so the sitemap,
   canonical tags and Open Graph URLs all match.

Registering elsewhere works too — point the nameservers at Cloudflare first, or
add the CNAME the Pages dashboard gives you.

### Other hosts

- **Netlify / Vercel** — build command `npm run build`, publish directory `dist`.
  The generated `_headers` and `_redirects` are Netlify-compatible too.
- **GitHub Pages** — `.github/workflows/deploy.yml` is included but runs only on
  manual dispatch. Enable Pages with "GitHub Actions" as the source first.
- **Any static host** — run `npm run build` and upload `dist/`.

`.github/workflows/ci.yml` runs the build and the quality gate on every push
regardless of host, so a broken build is caught before it is published.

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

MIT for the code. Content is © China Trip Compass.
