# Monetisation strategy — China Trip Compass

How this site is designed to make money, in what order to switch each stream on,
and what each one is realistically worth. Every mechanism described here already
has a slot in the codebase; the work is configuration and partnership approval,
not development.

---

## 1. Why this niche monetises well

China travel is an unusually good affiliate niche for four structural reasons:

1. **High-consideration, high-ticket purchases.** A China trip involves flights,
   10–20 hotel nights, rail tickets, tours, insurance and connectivity. Average
   order values are high, so even modest commission rates produce meaningful
   revenue per converting reader.
2. **Genuine friction that a guide can remove.** Visas, QR payments, the firewall
   and rail booking are real problems with real solutions. Readers arrive with
   *transactional intent* — "how do I book Chinese train tickets" is one step
   from a booking, unlike "photos of the Great Wall".
3. **Information decay.** Entry rules changed repeatedly from 2023 onwards, which
   means most competing content is out of date. Accurate, dated content wins
   rankings against older domain authority.
4. **Recovering, under-served market.** Independent foreign travel to China
   collapsed 2020–2023 and is rebuilding. English-language coverage has not kept
   pace, so competition for long-tail queries is unusually weak.

---

## 2. Revenue streams, in priority order

### Stream 1 — Affiliate commission (primary, ~60–70% of revenue at maturity)

The core model. Slots are already declared in `src/content/site.mjs` under
`MONETISATION.partners` and rendered by `partnerSlot()` in
`src/lib/templates.mjs`. Set `enabled: true` and add the tracked URL to
activate one.

| Partner category | Typical commission | Where it belongs | Approval difficulty |
| --- | --- | --- | --- |
| **Hotels** (Trip.com, Booking.com, Agoda) | 4–7% of stay | Every destination page, accommodation guide | Easy |
| **Tours & tickets** (GetYourGuide, Klook, Viator) | 8–12% | Destination pages, Great Wall, itineraries | Easy |
| **Travel eSIM** (Airalo, Holafly, Nomad) | 10–15% | Internet/VPN guide, first-timer guide, packing list | Easy |
| **Travel insurance** (SafetyWing, World Nomads, HeyMondo) | 10–20% of premium | Health & safety, Tibet, packing list | Medium |
| **Rail & flights** (Trip.com) | 3–6% | Transport guide, every itinerary | Easy |
| **Visa services** | Fixed fee per application | Visa guide | Medium |
| **VPN** (recurring subscriptions) | 30–100% of first term | Internet guide | Easy, high value |
| **Luggage & gear** (Amazon Associates) | 1–4% | Packing list | Easy, low value |

**Highest-value pages to monetise first** — these are the pages with the
strongest commercial intent per visitor:

1. `/guides/internet-vpn-apps-china/` → eSIM + VPN. Best revenue-per-visitor on
   the site: high intent, recurring VPN commissions, low-friction purchase.
2. `/guides/accommodation-in-china/` and every destination page → hotels.
3. `/destinations/great-wall-of-china/` → tours and tickets. High search volume,
   and the "which section, how do I get there" question converts to a booked day
   trip.
4. `/guides/transport-in-china/` → rail booking.
5. `/guides/health-and-safety-in-china/` and `/destinations/tibet-lhasa/` →
   insurance. Tibet in particular requires altitude cover, which is a specific,
   high-conversion recommendation.
6. `/guides/china-visa-guide/` → visa services, for the nationalities that still
   need a visa.

**Rules the site holds to** (these protect long-term trust, which is the actual
asset):

- Every affiliate link carries `rel="sponsored"`, applied automatically.
- Disclosure appears in the footer of every page and in each partner slot.
- Where the best option is not commissionable, the guide says so. Several pages
  explicitly steer readers to the cheaper non-affiliate choice. This costs
  short-term revenue and is why the recommendations are worth reading.

### Stream 2 — First-party digital products (~20–25%, highest margin)

Two products are already scaffolded in `MONETISATION.products` with live pages
at `/shop/china-trip-planner/` and `/shop/survival-mandarin-pack/`.

| Product | Price | Margin | Rationale |
| --- | --- | --- | --- |
| **The China Trip Planner** (PDF + spreadsheet) | $19 | ~95% | Converts the site's research into dated checklists and editable templates |
| **Offline Survival Mandarin Pack** (cards + audio) | $9 | ~95% | Solves a genuine failure mode: app dies, no signal, need to communicate |
| *Future:* city bundles, printable maps | $5–12 | ~95% | Low effort once the format exists |
| *Future:* "Done-for-you" itinerary review | $79–149 | ~80% | Service tier; caps at your own time |

This is the stream to grow. It has no platform risk, no commission clawbacks,
no cookie-window dependency, and — crucially — it is the funding source with the
least influence on editorial judgement.

**To activate:** connect a payment processor with digital delivery. Lemon Squeezy
or Paddle handle EU/UK VAT as merchant of record, which matters when selling
digital goods internationally; Gumroad and Stripe + a delivery service are the
alternatives. The product pages need only a live checkout URL.

### Stream 3 — Email list (multiplier, not a stream)

The newsletter block appears on every page (`newsletterBlock()`), currently
pointing at a placeholder action.

The list is the highest-leverage asset because it is the only channel not
intermediated by Google. Its value is:

- **Re-marketing to a fixed audience** — a China trip is planned over 2–6 months,
  so a reader who arrives 5 months out can be reached when they are actually
  booking.
- **Product launches** — the two digital products convert far better by email
  than by on-page CTA.
- **Insulation from algorithm changes.**

**Positioning that works for this niche:** "the China entry rules that actually
changed this month". Visa-free lists, payment app rules and rail booking windows
genuinely move, which gives the newsletter a real reason to exist rather than
being a content dump.

**To activate:** point `MONETISATION.newsletter.action` at an ESP endpoint —
Kit (ConvertKit), Buttondown or MailerLite all accept a plain form POST. Expect
1.5–3% of visitors to subscribe with a relevant lead magnet.

### Stream 4 — Display advertising (~10–15%, switch on later)

`adSlot()` renders neutral placeholders until `ADSENSE_ID` is set; a real ID
emits AdSense units.

**Do not enable this early.** Display ads at low traffic earn very little and
measurably damage the reading experience and Core Web Vitals — which in turn
damages the rankings that everything else depends on.

| Traffic level | Network | Realistic RPM |
| --- | --- | --- |
| < 10k sessions/mo | None — do not run ads | — |
| 10k–50k | Google AdSense | $8–20 |
| 50k+ | Mediavine or Journey by Mediavine | $20–40 |
| 100k+ | Raptive (AdThrive) | $25–50 |

Travel is a high-RPM vertical, and readers planning a trip are commercially
valuable — so ad income scales well once traffic justifies it. Switch on at
around 25k monthly sessions, and cap at one in-article unit plus one sidebar
unit, which is what the templates already do.

### Stream 5 — Later-stage options

- **Sponsored placements**, clearly labelled, from eSIM providers, insurers or
  tour operators. Only viable at scale, and each one spends editorial trust.
- **Licensing content** to airlines, tour operators or corporate relocation
  services, which need accurate China practical information and rarely have it.
- **A curated small-group tour** run with a licensed operator, white-labelled.
  High revenue per booking (a China tour is $2,500–6,000 per person), but it
  changes the business from publishing to operating and creates the exact
  conflict of interest the editorial policy exists to prevent.
- **Membership** ($5/mo) for updated PDFs, a private Q&A and route reviews.
  Only worth it once the email list exceeds roughly 10,000.

---

## 3. Realistic revenue model

Assumes the SEO plan below works and traffic compounds over 18–24 months.
Figures are per month.

| Stage | Sessions/mo | Affiliate | Products | Ads | Total |
| --- | --- | --- | --- | --- | --- |
| Months 1–6 | 0–2,000 | $0–100 | $0–50 | $0 | **$0–150** |
| Months 6–12 | 2,000–15,000 | $200–900 | $100–400 | $0 | **$300–1,300** |
| Months 12–18 | 15,000–50,000 | $900–3,500 | $400–1,500 | $150–800 | **$1,500–5,800** |
| Months 18–30 | 50,000–150,000 | $3,500–11,000 | $1,500–5,000 | $1,000–4,500 | **$6,000–20,000** |

The variance is wide because it turns almost entirely on ranking for a handful
of high-intent commercial queries. The realistic downside is that the site
plateaus at a few thousand sessions and earns a few hundred dollars a month; the
realistic upside is a five-figure monthly business. Both outcomes come from the
same content — the difference is search performance.

Two assumptions worth stating plainly:

- **A converting reader is worth roughly $0.10–0.40 per session** in this niche
  at maturity, blended across all streams. That is the number to track.
- **Seasonality is severe.** China travel planning peaks January–April and
  July–September. Revenue in November is roughly half of March.

---

## 4. What already exists in the code

| Capability | Where | Status |
| --- | --- | --- |
| Affiliate slots with `rel="sponsored"` | `templates.mjs → partnerSlot()` | Built, disabled |
| Per-page partner targeting | `asidePartner:` in front matter | Built |
| Inline slots in content | `:::slot partner:esim` | Built |
| Product cards | `productSlot()` | Built, live |
| Newsletter capture | `newsletterBlock()` | Built, needs ESP endpoint |
| Ad slots (AdSense-ready) | `adSlot()` | Built, disabled |
| Disclosure in footer + slots | `templates.mjs` | Built, live |
| Analytics hook | `SITE.analyticsId` | Built, needs an ID |
| FAQ / Article / Breadcrumb schema | `seo.mjs` | Built, live |

Everything is off by default so the site never ships broken affiliate links or
half-configured ad units.

---

## 5. Activation checklist, in order

1. **Register a domain**, set `SITE_URL`, deploy. Verify in Google Search
   Console and Bing Webmaster Tools; submit `/sitemap.xml`.
2. **Add analytics** — set `ANALYTICS_ID` (or, for a privacy-friendlier and
   cookie-banner-free option, swap in Plausible or Fathom).
3. **Connect the newsletter** to an ESP and add a lead magnet: the entry-rules
   update is the natural one for this audience.
4. **Apply to affiliate programmes** — Trip.com, GetYourGuide and Klook accept
   new sites readily; insurance and eSIM programmes usually want to see live
   traffic first. Start with the three easy ones.
5. **Enable partner slots** on the six high-intent pages listed above.
6. **Launch the two digital products** once traffic exceeds ~5,000 sessions/mo,
   with the payment processor handling VAT.
7. **Add display ads at ~25,000 sessions/mo**, not before. Apply to Mediavine at
   50,000.
8. **Review quarterly:** revenue per session by page, which partners actually
   convert, and which pages earn nothing and should be re-pointed.

---

## 6. SEO plan the revenue depends on

The monetisation only works if the traffic arrives. The content is built around
a specific search strategy:

**Query targeting.** Every page targets a cluster of real questions rather than
a single keyword. The FAQ sections at the bottom of each page are not filler —
they emit `FAQPage` structured data and target the long-tail question queries
("do I need a VPN in China", "can foreigners stay in any hotel in China") that
convert far better than head terms.

**Topical authority.** Seventy interlinked pages covering entry, money,
connectivity, transport, accommodation, safety, 20+ destinations, itineraries,
food and culture signal genuine subject coverage rather than a thin affiliate
site. Internal linking is dense and contextual, and every page carries related
links plus breadcrumbs.

**Freshness as a moat.** The competitive weakness of existing China content is
that it is out of date. `updated` dates are surfaced on-page and in
`dateModified`; the editorial policy commits to quarterly review of the
entry, payment and connectivity guides. Re-publishing an accurate visa page each
time the rules change is the single highest-return SEO activity available here.

**Technical baseline already in place:** static HTML with no framework overhead,
canonical URLs, Open Graph and Twitter cards, `Article` / `FAQPage` /
`BreadcrumbList` / `TouristDestination` / `ItemList` / `Organization` /
`WebSite` structured data, XML sitemap, RSS feed, a human-readable page index,
semantic headings with one `H1` per page, and `npm run check` as a build gate
that fails on broken links, missing metadata or invalid JSON-LD.

**AI crawlers are explicitly allowed** in `robots.txt`. Increasingly, travel
research starts in an assistant rather than a search box, and being the cited
source in those answers is becoming as valuable as ranking.

**What still needs doing after launch:** original photography (the site
currently ships no photos, which is a real ranking and engagement gap), a
backlink strategy, and Search Console monitoring to find which long-tail queries
are already producing impressions and deserve their own page.
