import { SITE } from '../content/site.mjs';

export const abs = (path = '/') =>
  /^https?:\/\//.test(path) ? path : `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;

export function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj, null, 0).replace(/</g, '\\u003c')}</script>`;
}

export function organisationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE.url}/#organisation`,
    name: SITE.name,
    url: `${SITE.url}/`,
    description: SITE.description,
    email: SITE.contactEmail,
    foundingDate: SITE.founded,
    logo: {
      '@type': 'ImageObject',
      url: abs('/assets/logo.svg'),
      width: 512,
      height: 512,
    },
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: `${SITE.url}/`,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: { '@id': `${SITE.url}/#organisation` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/search/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(crumbs) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: c.label,
      item: abs(c.href),
    })),
  };
}

export function articleSchema(page) {
  return {
    '@type': 'Article',
    '@id': `${abs(page.url)}#article`,
    headline: page.title,
    description: page.description,
    inLanguage: SITE.lang,
    datePublished: page.published || page.updated,
    dateModified: page.updated,
    mainEntityOfPage: { '@type': 'WebPage', '@id': abs(page.url) },
    author: {
      '@type': 'Organization',
      name: page.author || SITE.name,
      url: `${SITE.url}/about/`,
    },
    publisher: { '@id': `${SITE.url}/#organisation` },
    ...(page.keywords?.length ? { keywords: page.keywords.join(', ') } : {}),
  };
}

/**
 * A page answering ONE question. Distinct from FAQPage, which is for a page
 * carrying several questions alongside other content. Never emit both.
 */
export function qaPageSchema(page, answerText) {
  return {
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: page.question || page.title,
      text: page.question || page.title,
      answerCount: 1,
      acceptedAnswer: { '@type': 'Answer', text: answerText, url: abs(page.url) },
      author: { '@type': 'Organization', name: SITE.name },
    },
  };
}

export function faqSchema(faqs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function destinationSchema(page) {
  return {
    '@type': 'TouristDestination',
    name: page.place || page.title,
    description: page.description,
    ...(page.region ? { touristType: 'International visitors', containedInPlace: { '@type': 'Country', name: 'China' } } : {}),
    ...(page.lat && page.lon
      ? { geo: { '@type': 'GeoCoordinates', latitude: page.lat, longitude: page.lon } }
      : {}),
    url: abs(page.url),
  };
}

export function howToSchema(page, steps) {
  return {
    '@type': 'HowTo',
    name: page.title,
    description: page.description,
    step: steps.map((s, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url } : {}),
    })),
  };
}

export function itemListSchema(items, name) {
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: it.title,
      url: abs(it.url),
    })),
  };
}

export function graph(nodes) {
  return jsonLd({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });
}
