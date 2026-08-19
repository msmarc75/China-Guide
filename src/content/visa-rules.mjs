/**
 * China entry rules, as data.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO UPDATE WHEN THE RULES CHANGE — and they change roughly every six months
 * ─────────────────────────────────────────────────────────────────────────────
 * Adding a country to a scheme is one push into one array, plus a new `checked`
 * date on that scheme. Nothing else needs touching. That is the whole point of
 * separating scheme membership from the country list: the update surface stays
 * tiny, so it actually gets done.
 *
 * If you cannot confirm a country from an official source, set its confidence
 * to 'verify' rather than guessing. The tool renders those in amber and tells
 * the reader to check with their embassy. On a visa tool, a wrong "yes" costs
 * somebody a flight.
 *
 * Official sources: the Chinese embassy in the traveller's country, and the
 * National Immigration Administration (nia.gov.cn).
 */

export const LAST_REVIEWED = '2026-08-19';

/* ------------------------------------------------------------------ *
 * The schemes themselves — conditions live here, not on each country.
 * ------------------------------------------------------------------ */

export const SCHEMES = {
  unilateral30: {
    id: 'unilateral30',
    label: 'Visa-free entry, 30 days',
    short: 'Visa-free (30 days)',
    maxDays: 30,
    purposes: ['tourism', 'business', 'family', 'transit'],
    exitRule: 'any',
    geography: 'mainland',
    summary:
      'You can enter mainland China without applying for anything. Book a flight, land, present your passport, get a stamp.',
    requires: [
      'Passport valid for at least six months',
      'An onward or return ticket — airlines check this at boarding',
      'An address for your first night',
    ],
    caveats: [
      'These are trial schemes with published end dates, and they have been revised roughly every six months since 2023. Confirm before booking anything non-refundable.',
      'The 30 days cannot normally be extended. You leave and, if still eligible, re-enter.',
    ],
  },

  transit240: {
    id: 'transit240',
    label: '240-hour visa-free transit',
    short: 'Transit visa-free (10 days)',
    maxDays: 10,
    purposes: ['tourism', 'business', 'transit'],
    exitRule: 'thirdCountry',
    geography: 'permittedProvinces',
    summary:
      'You can stay up to 240 hours — ten days — without a visa, provided you are travelling onward to a third country or region.',
    requires: [
      'A confirmed onward ticket to a country or region DIFFERENT from the one you arrived from',
      'Entry and exit through one of the designated ports',
      'Staying inside the permitted provinces and municipalities',
    ],
    caveats: [
      'The clock starts at 00:00 on the day AFTER you arrive, so you effectively get part of your arrival day plus ten full days.',
      'A return ticket to your country of origin does NOT qualify, however long the gap.',
      'Hong Kong, Macau and Taiwan count as third regions, which makes London → Beijing → Hong Kong a valid routing.',
      'Ground staff outside Asia are not always familiar with the scheme. Have the policy name and your onward booking on screen at check-in.',
    ],
  },

  hainan30: {
    id: 'hainan30',
    label: 'Hainan visa-free entry, 30 days',
    short: 'Hainan only (30 days)',
    maxDays: 30,
    purposes: ['tourism'],
    exitRule: 'any',
    geography: 'hainanOnly',
    summary:
      'Hainan island runs its own visa-free scheme, entirely separate from the mainland ones.',
    requires: [
      'Arriving directly at Haikou Meilan or Sanya Phoenix airport',
      'Travelling for tourism',
    ],
    caveats: [
      'The permission covers Hainan province ONLY. Travelling on to the mainland needs a visa or separate eligibility.',
      'Hainan is also one of the 24 areas open to 240-hour visa-free transit, added in December 2024. If you qualify for that scheme it is the more flexible route, because it lets you continue to the mainland.',
    ],
  },

  visaL: {
    id: 'visaL',
    label: 'L tourist visa',
    short: 'Tourist visa required',
    maxDays: 60,
    purposes: ['tourism', 'business', 'family', 'transit'],
    exitRule: 'any',
    geography: 'mainland',
    summary:
      'You apply in advance at a Chinese Visa Application Service Centre. Standard processing is four working days.',
    requires: [
      'Completed online application (COVA), printed and signed',
      'Passport valid 6+ months with two blank pages',
      'One recent passport photo, white background',
      'Proof of round-trip flights and accommodation for the whole stay',
      'Fingerprints, given in person at the visa centre',
    ],
    caveats: [
      'Appointment slots in London, New York, Paris and Sydney book out weeks ahead, especially March to June. Apply 4–8 weeks before you travel.',
      'Cost runs roughly US$30–140 depending on nationality. US citizens pay the most but receive a 10-year multiple-entry visa as standard.',
    ],
  },
};

/* ------------------------------------------------------------------ *
 * Scheme membership. THIS is what you edit when the rules change.
 * ------------------------------------------------------------------ */

export const SCHEME_MEMBERS = {
  // 55 codes: the National Immigration Administration's own 50-country
  // unilateral list (nia.gov.cn/n741440/n741577/c1731154, last revised
  // 17 February 2026 — the revision that added Canada and the United
  // Kingdom), plus five countries that reach the same 30-day outcome
  // through MUTUAL exemption agreements rather than the unilateral scheme:
  // Thailand, Malaysia, Singapore, Qatar and the UAE. Those five sit here
  // for the traveller's answer rather than for taxonomic tidiness — the
  // question this tool answers is "do I need a visa", not "under which
  // instrument".
  //
  // The list is easy to under-count. Eight of the fifty are neither EU nor
  // Schengen and are routinely dropped from secondary sources: Andorra,
  // Monaco, Liechtenstein, Montenegro, North Macedonia, and the Gulf trio
  // of Oman, Kuwait and Bahrain, whose entry began as a June 2025 trial and
  // now runs to 31 December 2026. Cross-checked against the Chinese
  // consulate in San Francisco's visa-free FAQ, updated June 2026.
  //
  // Czechia and Lithuania are the only Schengen states still off the list;
  // they get 240-hour transit only.
  unilateral30: {
    checked: '2026-08-19',
    codes: [
      'AT', 'BE', 'BG', 'HR', 'CY', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
      'HU', 'IE', 'IT', 'LV', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
      'SI', 'ES', 'SE', 'CH', 'NO', 'IS', 'GB', 'CA', 'RU', 'AU', 'NZ',
      'JP', 'KR', 'SG', 'MY', 'TH', 'BN', 'BR', 'AR', 'CL', 'PE', 'UY',
      'AE', 'QA', 'SA', 'OM', 'KW', 'BH', 'AD', 'MC', 'LI', 'ME', 'MK',
    ],
  },
  // The 55-country list as expanded on 12 June 2025, when Indonesia was
  // added (NIA announcement; Xinhua). The Asian seven are South Korea,
  // Japan, Singapore, Brunei, the UAE, Qatar and Indonesia.
  transit240: {
    checked: '2026-08-19',
    codes: [
      'US', 'CA', 'GB', 'IE', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE',
      'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'AU', 'NZ', 'JP',
      'KR', 'SG', 'BN', 'ID', 'BR', 'AR', 'CL', 'MX', 'RU', 'UA', 'QA', 'AE',
    ],
  },
  hainan30: {
    checked: '2026-08-19',
    codes: [
      'US', 'CA', 'GB', 'IE', 'AT', 'BE', 'DK', 'FI', 'FR', 'DE', 'IT', 'NL',
      'NO', 'PL', 'PT', 'ES', 'SE', 'CH', 'AU', 'NZ', 'JP', 'KR', 'SG', 'MY',
      'TH', 'ID', 'PH', 'BR', 'AR', 'CL', 'MX', 'RU', 'UA', 'KZ', 'AE', 'QA',
    ],
  },
};

/* ------------------------------------------------------------------ *
 * Countries. `confidence: 'verify'` renders a warning instead of a yes.
 * ------------------------------------------------------------------ */

export const COUNTRIES = [
  { code: 'AD', name: 'Andorra', note: 'On China’s 30-day unilateral visa-free list in its own right. Small European states are routinely dropped from secondary lists that summarise the policy as “the EU and Schengen”.' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BH', name: 'Bahrain', note: 'Visa-free entry for Saudi Arabia, Oman, Kuwait and Bahrain began as a trial on 9 June 2025 and has been extended to 31 December 2026, completing visa-free coverage of all six GCC states.' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'CA', name: 'Canada', note: 'Added to the unilateral visa-free list on 17 February 2026. A great deal of published advice still says Canadians need a visa; they do not, for stays up to 30 days.' },
  { code: 'CL', name: 'Chile' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czechia', note: 'Czechia and Lithuania are the only Schengen states still off the 30-day unilateral visa-free list. Advice that says "all of Schengen is visa-free" is wrong for you — the 240-hour transit scheme applies instead.' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India', confidence: 'verify', note: 'India is not on the unilateral or transit lists we could confirm. Assume a visa is required and check with your nearest Chinese embassy.' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel', confidence: 'verify', note: 'We could not confirm Israel on the current lists. Check with the Chinese embassy.' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KW', name: 'Kuwait', note: 'Visa-free entry for Saudi Arabia, Oman, Kuwait and Bahrain began as a trial on 9 June 2025 and has been extended to 31 December 2026, completing visa-free coverage of all six GCC states.' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LI', name: 'Liechtenstein', note: 'On China’s 30-day unilateral visa-free list in its own right. Small European states are routinely dropped from secondary lists that summarise the policy as “the EU and Schengen”.' },
  { code: 'LT', name: 'Lithuania', note: 'Lithuania and Czechia are the only Schengen states still off the 30-day unilateral visa-free list. Advice that says "all of Schengen is visa-free" is wrong for you — the 240-hour transit scheme applies instead.' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MT', name: 'Malta' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MC', name: 'Monaco', note: 'On China’s 30-day unilateral visa-free list in its own right. Small European states are routinely dropped from secondary lists that summarise the policy as “the EU and Schengen”.' },
  { code: 'ME', name: 'Montenegro', note: 'Montenegro and North Macedonia are on the 30-day unilateral list despite being outside the EU and the Schengen area.' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'MK', name: 'North Macedonia', note: 'Montenegro and North Macedonia are on the 30-day unilateral list despite being outside the EU and the Schengen area.' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman', note: 'Visa-free entry for Saudi Arabia, Oman, Kuwait and Bahrain began as a trial on 9 June 2025 and has been extended to 31 December 2026, completing visa-free coverage of all six GCC states.' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ZA', name: 'South Africa', confidence: 'verify', note: 'We could not confirm South Africa on the current lists. Check with the Chinese embassy.' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TH', name: 'Thailand' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States', note: 'Not on the unilateral visa-free list. A 10-year multiple-entry L visa is standard when applying.' },
  { code: 'UY', name: 'Uruguay' },
];

export const PURPOSES = [
  { id: 'tourism', label: 'Tourism' },
  { id: 'business', label: 'Business meetings' },
  { id: 'family', label: 'Visiting family or friends' },
  { id: 'transit', label: 'Passing through' },
];

/**
 * The 24 province-level areas open to the 240-hour scheme, as set by the
 * December 2024 revision. Three of them admit transit visitors to named
 * cities only rather than the whole province, which is the detail almost
 * every English summary drops — so it is carried in the label itself,
 * because these strings are rendered straight to the user by the checker.
 */
export const PERMITTED_PROVINCES_240H = [
  'Beijing', 'Tianjin', 'Hebei', 'Liaoning', 'Heilongjiang', 'Shanghai',
  'Jiangsu', 'Zhejiang', 'Anhui', 'Fujian', 'Jiangxi (Nanchang and Jingdezhen only)',
  'Shandong', 'Henan', 'Hubei', 'Hunan', 'Guangdong',
  'Guangxi (12 named cities, including Nanning, Guilin and Beihai)',
  'Hainan', 'Chongqing', 'Sichuan', 'Guizhou', 'Yunnan',
  'Shanxi (Taiyuan and Datong only)', 'Shaanxi',
];

/** The seven province-level areas outside the 240-hour scheme. */
export const EXCLUDED_FROM_240H = ['Tibet', 'Xinjiang', 'Inner Mongolia', 'Gansu', 'Qinghai', 'Ningxia', 'Jilin'];

/* ------------------------------------------------------------------ *
 * Resolver — a pure function, shared by the build and the browser.
 * ------------------------------------------------------------------ */

export function schemesFor(code) {
  return Object.entries(SCHEME_MEMBERS)
    .filter(([, group]) => group.codes.includes(code))
    .map(([id]) => id);
}

/**
 * @param {{country: string, purpose: string, days: number, onwardThirdCountry: boolean, hainanOnly: boolean}} input
 * @returns {{primary: object|null, alternatives: object[], warnings: string[], country: object|null}}
 */
export function resolve(input) {
  const country = COUNTRIES.find((c) => c.code === input.country) || null;
  const warnings = [];
  if (!country) return { primary: null, alternatives: [], warnings, country: null };

  const eligible = schemesFor(country.code);
  const days = Number(input.days) || 1;
  const candidates = [];

  const consider = (id, extraWarnings = []) => {
    const scheme = SCHEMES[id];
    if (!eligible.includes(id)) return;
    if (!scheme.purposes.includes(input.purpose)) return;
    if (days > scheme.maxDays) return;
    if (scheme.exitRule === 'thirdCountry' && !input.onwardThirdCountry) return;
    if (scheme.geography === 'hainanOnly' && !input.hainanOnly) return;
    if (scheme.geography !== 'hainanOnly' && input.hainanOnly && id !== 'unilateral30') return;
    candidates.push({ scheme, extraWarnings });
  };

  consider('unilateral30');
  consider('hainan30');
  consider('transit240');

  // Near misses are worth telling the reader about — they are usually fixable.
  if (eligible.includes('transit240') && !input.onwardThirdCountry && days <= 10) {
    warnings.push(
      'You are eligible for 240-hour visa-free transit, but only with an onward ticket to a THIRD country or region. A return ticket home does not qualify — routing your exit via Hong Kong, Seoul or Tokyo would.'
    );
  }
  if (eligible.includes('unilateral30') && days > 30) {
    warnings.push(
      `Visa-free entry covers 30 days and you have asked about ${days}. Stays beyond 30 days need a visa; visa-free entries cannot normally be extended.`
    );
  }
  if (eligible.includes('transit240') && !eligible.includes('unilateral30') && days > 10) {
    warnings.push(
      `The transit scheme covers 10 days and you have asked about ${days}. A tourist visa is the route for a longer stay.`
    );
  }
  if (country.confidence === 'verify') {
    warnings.push(
      country.note ||
        'We could not confirm this nationality against an official source. Treat the result as indicative only.'
    );
  }

  const primary = candidates[0] ? candidates[0].scheme : SCHEMES.visaL;
  const alternatives = candidates.slice(1).map((c) => c.scheme);
  if (!candidates.length) alternatives.push(...eligible.map((id) => SCHEMES[id]));

  return { primary, alternatives, warnings, country };
}
