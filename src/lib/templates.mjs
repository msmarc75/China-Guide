import { SITE, NAV, FOOTER_LINKS, MONETISATION } from '../content/site.mjs';
import { COUNTRIES, PURPOSES, LAST_REVIEWED, schemesFor } from '../content/visa-rules.mjs';
import { escapeHtml } from './markdown.mjs';
import { abs } from './seo.mjs';

const BUILD_ASSET_VERSION = '1';

export function isActive(page, item) {
  return page.url === item.href || (item.match && page.url.startsWith(item.match));
}

/* ------------------------------------------------------------------ *
 * Monetisation components
 * ------------------------------------------------------------------ */

export function partnerSlot(key, { compact = false } = {}) {
  const p = MONETISATION.partners[key];
  if (!p) return '';
  const live = p.enabled && p.href && p.href !== '#';
  const cta = live
    ? `<a class="btn btn--primary" href="${p.href}" rel="sponsored noopener" target="_blank">${escapeHtml(p.cta)}</a>`
    : `<span class="btn btn--ghost" aria-disabled="true" title="Partner link not configured yet">${escapeHtml(p.cta)}</span>`;
  return `<aside class="promo-slot${compact ? ' promo-slot--compact' : ''}" data-slot="${key}">
  <p class="promo-slot__label">Partner pick</p>
  <p class="promo-slot__name">${escapeHtml(p.name)}</p>
  <p class="promo-slot__blurb">${escapeHtml(p.blurb)}</p>
  ${cta}
  <p class="promo-slot__disc">Affiliate link — we may earn a commission, you pay the same price.</p>
</aside>`;
}

export function productSlot(id) {
  const p = MONETISATION.products.find((x) => x.id === id);
  if (!p || !p.enabled) return '';
  return `<aside class="product-slot" data-product="${p.id}">
  <p class="product-slot__label">From our shop</p>
  <h3 class="product-slot__name">${escapeHtml(p.name)} <span class="product-slot__price">${escapeHtml(p.price)}</span></h3>
  <p>${escapeHtml(p.blurb)}</p>
  <a class="btn btn--primary" href="${p.href}">${escapeHtml(p.cta)}</a>
</aside>`;
}

export function newsletterBlock() {
  const n = MONETISATION.newsletter;
  return `<section class="newsletter" id="newsletter">
  <div class="newsletter__inner">
    <h2>${escapeHtml(n.heading)}</h2>
    <p>${escapeHtml(n.blurb)}</p>
    <form class="newsletter__form" action="${n.action}" method="post" data-newsletter>
      <label class="sr-only" for="nl-email">Email address</label>
      <input id="nl-email" name="email" type="email" required placeholder="you@example.com" autocomplete="email">
      <button class="btn btn--primary" type="submit">${escapeHtml(n.cta)}</button>
    </form>
    <p class="newsletter__note">No spam. We never sell your address. Unsubscribe any time.</p>
  </div>
</section>`;
}

export function adSlot(position = 'in-article') {
  if (!SITE.adsenseId) {
    return `<div class="ad-slot" data-ad-position="${position}" aria-hidden="true"><span>Ad slot — ${position}</span></div>`;
  }
  return `<div class="ad-slot" data-ad-position="${position}">
  <ins class="adsbygoogle" style="display:block" data-ad-client="${SITE.adsenseId}" data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;
}

/**
 * The visa checker.
 *
 * The form is progressive enhancement over a full static table: with no
 * JavaScript the reader still gets every rule, and search engines index real
 * content rather than an empty container. The browser imports the SAME
 * visa-rules module the build uses, so the two can never drift apart.
 */
export function visaCheckerWidget() {
  const countryOptions = COUNTRIES.map(
    (c) => `<option value="${c.code}">${escapeHtml(c.name)}</option>`
  ).join('');
  const purposeOptions = PURPOSES.map(
    (p) => `<option value="${p.id}">${escapeHtml(p.label)}</option>`
  ).join('');

  const rows = COUNTRIES.map((c) => {
    const schemes = schemesFor(c.code);
    const cell = (id) =>
      schemes.includes(id) ? '<td class="yes">Yes</td>' : '<td class="no">No</td>';
    const flag =
      c.confidence === 'verify'
        ? ' <span class="verify-flag" title="Not confirmed against an official source">unconfirmed</span>'
        : '';
    return `<tr><th scope="row">${escapeHtml(c.name)}${flag}</th>${cell('unilateral30')}${cell(
      'transit240'
    )}${cell('hainan30')}</tr>`;
  }).join('');

  return `<section class="visa-tool" id="visa-checker">
  <form class="visa-tool__form" id="visa-form" novalidate>
    <div class="visa-tool__field">
      <label for="visa-country">Your passport</label>
      <select id="visa-country" name="country" required>
        <option value="">Choose a country…</option>
        ${countryOptions}
      </select>
    </div>
    <div class="visa-tool__field">
      <label for="visa-purpose">Reason for the trip</label>
      <select id="visa-purpose" name="purpose">${purposeOptions}</select>
    </div>
    <div class="visa-tool__field">
      <label for="visa-days">Nights in China</label>
      <input id="visa-days" name="days" type="number" min="1" max="180" value="14" inputmode="numeric">
    </div>
    <fieldset class="visa-tool__checks">
      <legend class="sr-only">Trip details</legend>
      <label class="visa-tool__check">
        <input type="checkbox" id="visa-onward" name="onward">
        <span>I leave China for a <strong>different</strong> country from the one I arrived from</span>
      </label>
      <label class="visa-tool__check">
        <input type="checkbox" id="visa-hainan" name="hainan">
        <span>I am only visiting Hainan island</span>
      </label>
    </fieldset>
    <button class="btn btn--primary" type="submit">Check my entry route</button>
  </form>

  <output class="visa-tool__result" id="visa-result" aria-live="polite"></output>

  <p class="visa-tool__disclaimer">
    <strong>Indicative only.</strong> China's visa-free schemes carry expiry dates and have been
    revised roughly every six months since 2023. Confirm your own nationality and routing with the
    Chinese embassy in your country before booking anything non-refundable. Rules last reviewed
    ${LAST_REVIEWED}.
  </p>

  <details class="visa-tool__table" open>
    <summary>Full table — every nationality and scheme</summary>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Passport</th>
            <th scope="col">Visa-free 30 days</th>
            <th scope="col">240-hour transit</th>
            <th scope="col">Hainan 30 days</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </details>
</section>
<script type="module" src="/assets/visa-checker.js"></script>`;
}

/** Renders `:::slot name` containers found in markdown content. */
export function slotRenderer(name, body) {
  const [kind, key] = name.split(':').map((s) => s.trim());
  if (kind === 'partner') return partnerSlot(key);
  if (kind === 'product') return productSlot(key);
  if (kind === 'ad') return adSlot(key || 'in-article');
  if (kind === 'newsletter') return newsletterBlock();
  if (kind === 'tool' && key === 'visa-checker') return visaCheckerWidget();
  return body ? `<div class="slot-unknown">${escapeHtml(body)}</div>` : '';
}

/* ------------------------------------------------------------------ *
 * Layout pieces
 * ------------------------------------------------------------------ */

function head(page) {
  const title = page.metaTitle || `${page.title} | ${SITE.name}`;
  const canonical = abs(page.url);
  const ogImage = abs(page.image || '/assets/og-default.svg');
  const robots = page.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';

  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(page.description || SITE.description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${robots}">
${page.keywords?.length ? `<meta name="keywords" content="${escapeHtml(page.keywords.join(', '))}">` : ''}
<meta name="theme-color" content="${SITE.themeColor}">
<meta name="author" content="${escapeHtml(page.author || SITE.name)}">
<meta property="og:type" content="${page.type === 'article' ? 'article' : 'website'}">
<meta property="og:site_name" content="${escapeHtml(SITE.name)}">
<meta property="og:title" content="${escapeHtml(page.ogTitle || page.title)}">
<meta property="og:description" content="${escapeHtml(page.description || SITE.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:locale" content="${SITE.locale}">
${page.updated ? `<meta property="article:modified_time" content="${page.updated}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="${SITE.twitter}">
<meta name="twitter:title" content="${escapeHtml(page.ogTitle || page.title)}">
<meta name="twitter:description" content="${escapeHtml(page.description || SITE.description)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/logo.svg">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE.name)}" href="/feed.xml">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
<link rel="stylesheet" href="/assets/styles.css?v=${BUILD_ASSET_VERSION}">
${page.hreflang || ''}
${page.schema || ''}
${SITE.analyticsId ? `<script defer src="https://www.googletagmanager.com/gtag/js?id=${SITE.analyticsId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${SITE.analyticsId}');</script>` : ''}
${SITE.adsenseId ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseId}" crossorigin="anonymous"></script>` : ''}`;
}

function header(page) {
  const links = NAV.map(
    (item) =>
      `<li><a href="${item.href}"${isActive(page, item) ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a></li>`
  ).join('');
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="/">
      <span class="brand__mark" aria-hidden="true">指</span>
      <span class="brand__text"><strong>China</strong> Trip Compass</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
    <nav id="primary-nav" class="site-nav" aria-label="Primary">
      <ul>${links}</ul>
    </nav>
    <form class="site-search" role="search" action="/search/" method="get">
      <label class="sr-only" for="q">Search the guide</label>
      <input id="q" name="q" type="search" placeholder="Search: visa, Alipay, Great Wall…" autocomplete="off">
      <button type="submit" aria-label="Search">⌕</button>
      <div class="site-search__results" hidden></div>
    </form>
  </div>
</header>`;
}

function breadcrumbs(crumbs) {
  if (!crumbs?.length) return '';
  const items = crumbs
    .map((c, i) =>
      i === crumbs.length - 1
        ? `<li aria-current="page">${escapeHtml(c.label)}</li>`
        : `<li><a href="${c.href}">${escapeHtml(c.label)}</a></li>`
    )
    .join('');
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><div class="wrap"><ol>${items}</ol></div></nav>`;
}

function footer() {
  const cols = FOOTER_LINKS.map(
    (col) => `<div class="footer__col">
    <h2>${escapeHtml(col.title)}</h2>
    <ul>${col.links.map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`).join('')}</ul>
  </div>`
  ).join('');

  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer__grid">${cols}</div>
    <div class="footer__legal">
      <p><strong>${escapeHtml(SITE.name)}</strong> — independent travel research, written in English for foreign visitors to mainland China.</p>
      <p class="footer__disclosure">${MONETISATION.disclosure}</p>
      <p>© ${new Date().getFullYear()} ${escapeHtml(SITE.name)}. Entry rules, prices and opening hours change often — always confirm with the official source before you travel.</p>
    </div>
  </div>
</footer>
<script src="/assets/main.js?v=${BUILD_ASSET_VERSION}" defer></script>`;
}

export function tableOfContents(headings) {
  const items = headings.filter((h) => h.level === 2);
  if (items.length < 3) return '';
  return `<nav class="toc" aria-label="On this page">
  <p class="toc__title">On this page</p>
  <ol>${items.map((h) => `<li><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join('')}</ol>
</nav>`;
}

export function cardGrid(items, { columns = 3 } = {}) {
  if (!items.length) return '';
  const cards = items
    .map(
      (it) => `<article class="card">
    ${it.badge ? `<p class="card__badge">${escapeHtml(it.badge)}</p>` : ''}
    <h3 class="card__title"><a href="${it.url}">${escapeHtml(it.title)}</a></h3>
    <p class="card__desc">${escapeHtml(it.excerpt || it.description || '')}</p>
    ${it.meta ? `<p class="card__meta">${escapeHtml(it.meta)}</p>` : ''}
  </article>`
    )
    .join('');
  return `<div class="card-grid" data-columns="${columns}">${cards}</div>`;
}

export function relatedBlock(items) {
  if (!items?.length) return '';
  return `<section class="related">
  <h2>Keep planning</h2>
  ${cardGrid(items)}
</section>`;
}

/* ------------------------------------------------------------------ *
 * Page shell
 * ------------------------------------------------------------------ */

export function layout(page, body) {
  return `<!doctype html>
<html lang="${SITE.lang}" prefix="og: https://ogp.me/ns#">
<head>
${head(page)}
</head>
<body class="${page.bodyClass || ''}" data-page="${page.section || 'page'}">
${header(page)}
${breadcrumbs(page.crumbs)}
<main id="main">
${body}
</main>
${footer()}
</body>
</html>
`;
}
