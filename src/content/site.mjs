/**
 * Global site configuration: identity, navigation, and monetisation slots.
 *
 * `SITE.url` drives canonical URLs, sitemap entries and Open Graph tags.
 * Override it at build time with SITE_URL=https://example.com npm run build
 * when you deploy to your own domain.
 */

export const SITE = {
  name: 'China Trip Compass',
  shortName: 'China Compass',
  tagline: 'The complete China travel guide for foreign visitors',
  description:
    'A free, in-depth English guide to travelling in China: visas, payments, trains, food, etiquette, itineraries and city guides written for first-time foreign visitors.',
  url: (process.env.SITE_URL || 'https://chinatripcompass.com').replace(/\/$/, ''),
  locale: 'en_US',
  lang: 'en',
  themeColor: '#b3202c',
  publisher: 'China Trip Compass',
  twitter: '@chinacompass',
  founded: '2026',
  contactEmail: 'hello@chinatripcompass.com',
  // Set to a real ID to activate; left empty the tags are simply not emitted.
  analyticsId: process.env.ANALYTICS_ID || '',
  adsenseId: process.env.ADSENSE_ID || '',
};

export const NAV = [
  { label: 'Plan your trip', href: '/plan/', match: '/plan/' },
  { label: 'Destinations', href: '/destinations/', match: '/destinations/' },
  { label: 'Practical guides', href: '/guides/', match: '/guides/' },
  { label: 'Culture', href: '/culture/', match: '/culture/' },
  { label: 'Itineraries', href: '/itineraries/', match: '/itineraries/' },
  { label: 'Food', href: '/food/', match: '/food/' },
  { label: 'Answers', href: '/answers/', match: '/answers/' },
];

export const FOOTER_LINKS = [
  {
    title: 'Start here',
    links: [
      { label: 'Do I need a China visa? (tool)', href: '/tools/china-visa-checker/' },
      { label: 'China travel planning hub', href: '/plan/' },
      { label: 'First trip to China', href: '/plan/first-time-china-travel-guide/' },
      { label: 'Best time to visit China', href: '/plan/best-time-to-visit-china/' },
      { label: 'How much a China trip costs', href: '/plan/china-trip-cost-budget/' },
      { label: 'What to pack for China', href: '/plan/china-packing-list/' },
    ],
  },
  {
    title: 'Essentials',
    links: [
      { label: 'China visa & visa-free entry', href: '/guides/china-visa-guide/' },
      { label: 'Paying in China (Alipay & WeChat)', href: '/guides/money-and-payments-in-china/' },
      { label: 'Internet, VPN & apps', href: '/guides/internet-vpn-apps-china/' },
      { label: 'Trains, metros & flights', href: '/guides/transport-in-china/' },
      { label: 'Where to stay', href: '/guides/accommodation-in-china/' },
      { label: 'Health & safety', href: '/guides/health-and-safety-in-china/' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Beijing', href: '/destinations/beijing/' },
      { label: 'Shanghai', href: '/destinations/shanghai/' },
      { label: "Xi'an", href: '/destinations/xian/' },
      { label: 'Chengdu', href: '/destinations/chengdu/' },
      { label: 'Guilin & Yangshuo', href: '/destinations/guilin-yangshuo/' },
      { label: 'All destinations', href: '/destinations/' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'About this guide', href: '/about/' },
      { label: 'Editorial policy', href: '/editorial-policy/' },
      { label: 'Affiliate disclosure', href: '/affiliate-disclosure/' },
      { label: 'Privacy policy', href: '/privacy/' },
      { label: 'Contact', href: '/contact/' },
    ],
  },
];

/**
 * Monetisation slots.
 *
 * Every commercial unit on the site is declared here so partners, tracking
 * parameters and disclosure text live in one place. `enabled: false` renders a
 * neutral placeholder instead of a live link, which is what you want until the
 * affiliate programmes are actually approved.
 */
export const MONETISATION = {
  disclosure:
    'Some links on this page are affiliate links. If you book through them we earn a commission at no extra cost to you. We only recommend services we would use ourselves — see our <a href="/affiliate-disclosure/">affiliate disclosure</a>.',
  partners: {
    esim: {
      enabled: false,
      name: 'Airalo / Holafly China eSIM',
      blurb: 'Data eSIM activated before you fly. Check the provider routes its China plan internationally rather than through a local partner — that routing is what decides whether you get the open internet.',
      cta: 'Compare China eSIMs',
      href: '#',
      note: 'Typical commission: 10–15% of order value.',
    },
    trains: {
      enabled: false,
      name: 'Trip.com high-speed rail booking',
      blurb: 'Book Chinese high-speed rail tickets in English with a passport, weeks before you land.',
      cta: 'Check train times & fares',
      href: '#',
      note: 'Typical commission: 3–6% per ticket, higher on hotels.',
    },
    hotels: {
      enabled: false,
      name: 'Trip.com / Booking.com hotels',
      blurb: 'Filter for hotels licensed to accept foreign passports — a real constraint in smaller Chinese cities.',
      cta: 'Find foreigner-friendly hotels',
      href: '#',
      note: 'Typical commission: 4–7% of stay value.',
    },
    tours: {
      enabled: false,
      name: 'GetYourGuide / Klook / Viator',
      blurb: 'Skip-the-line tickets and English-guided day trips, cancellable up to 24 hours before.',
      cta: 'Browse tours & tickets',
      href: '#',
      note: 'Typical commission: 8–12% per booking.',
    },
    insurance: {
      enabled: false,
      name: 'SafetyWing / World Nomads travel insurance',
      blurb: 'Medical cover that pays international-clinic prices in Beijing and Shanghai.',
      cta: 'Compare travel insurance',
      href: '#',
      note: 'Typical commission: 10–20% of premium.',
    },
    visa: {
      enabled: false,
      name: 'Visa agency partner',
      blurb: 'Document check and courier service for the L tourist visa if you cannot reach a visa centre.',
      cta: 'Get visa help',
      href: '#',
      note: 'Typical commission: fixed fee per application.',
    },
  },
  // First-party products — the highest-margin layer of the model.
  products: [
    {
      id: 'planner',
      name: 'The China Trip Planner',
      price: '$19',
      blurb:
        'A 90-page PDF + spreadsheet: day-by-day templates for 7/10/14/21-day routes, a booking timeline, a printable offline phrasebook and QR-payment setup checklist.',
      cta: 'See what is inside',
      href: '/shop/china-trip-planner/',
      enabled: true,
    },
    {
      id: 'phrasebook',
      name: 'Offline Survival Mandarin Pack',
      price: '$9',
      blurb:
        '120 screenshot-ready phrase cards with characters, pinyin and audio — designed to be shown to a taxi driver when your data dies.',
      cta: 'Get the phrase pack',
      href: '/shop/survival-mandarin-pack/',
      enabled: true,
    },
  ],
  newsletter: {
    heading: 'Get the China entry rules that actually changed this month',
    blurb:
      'Visa-free lists, payment app rules and rail booking windows move fast. One email a month, no fluff, unsubscribe in a click.',
    cta: 'Send me the updates',
    action: '#',
  },
};
