/**
 * Pick the sidebar partner slot that matches what a page is actually about.
 *
 * Every page used to fall back to `tours`, so an answer page on eSIM routing
 * advertised day trips. Explicit `asidePartner:` front matter still wins; this
 * only decides the fallback.
 *
 * Two rules learned from getting it wrong:
 *   - Match on word boundaries, not substrings. `bus` inside "business card"
 *     sent an etiquette page to the rail partner.
 *   - Multi-word phrases outrank single words, because "where to stay" is a
 *     stronger signal than an incidental mention of a railway station.
 *
 * EXCLUDE patterns veto a partner outright. "Visa" the card brand is not
 * "visa" the document, and that false positive pointed ATM pages at a visa
 * service.
 */
const SIGNALS = {
  esim: ['vpn', 'internet', 'esim', 'sim card', 'wifi', 'wi-fi', 'firewall', 'blocked', 'apps', 'google', 'whatsapp', 'connectivity', 'roaming'],
  trains: ['train', 'rail', 'railway', 'metro', 'subway', 'airport', 'transport', 'airport transfer', 'flight', 'maglev', 'getting around', 'high-speed'],
  hotels: ['hotel', 'accommodation', 'hostel', 'airbnb', 'where to stay', 'neighbourhood', 'check-in', 'police registration'],
  insurance: ['safe', 'safety', 'health', 'vaccination', 'vaccine', 'insurance', 'altitude', 'medical', 'hospital', 'tap water', 'illness', 'emergency'],
  visa: ['visa', 'visa-free', 'entry requirements', 'passport', 'transit', 'immigration', 'customs', 'permit'],
  tours: ['tour', 'great wall', 'sights', 'things to do', 'itinerary', 'attraction', 'temple', 'museum', 'panda', 'terracotta', 'day trip'],
};

/** A partner is vetoed when one of these appears, however well it otherwise scores. */
const EXCLUDE = {
  visa: ['credit card', 'debit card', 'atm', 'mastercard', 'unionpay'],
};

const hasWord = (haystack, term) =>
  new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(haystack);

export function pickAsidePartner(page) {
  if (page.asidePartner) return page.asidePartner;

  const haystack = [page.title, page.navTitle, page.question, (page.keywords || []).join(' '), page.sectionId]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let best = null;
  let bestScore = 0;
  for (const [partner, words] of Object.entries(SIGNALS)) {
    if ((EXCLUDE[partner] || []).some((term) => hasWord(haystack, term))) continue;
    // Phrases are worth more than single words: they are far less likely to hit by accident.
    const score = words.reduce(
      (n, w) => (hasWord(haystack, w) ? n + (w.includes(' ') || w.includes('-') ? 3 : 1) : n),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = partner;
    }
  }
  return best || 'tours';
}
