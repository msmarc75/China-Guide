# Content audit, passes 1–9

A record of a nine-pass correctness audit of the whole site, so that the next
person to look at this does not repeat it. Forty defects were found and fixed
across PRs #46–#53.

The audit is **complete and closed**. Pass 9 checked roughly fifteen pages
across the highest-consequence remaining categories and found nothing. That is
the stopping condition, and the reasoning is set out at the bottom.

## Why the audit happened

The verification discipline this site now runs on — Chinese name, Chinese
address, named metro line, every claim cross-checked against two independent
sources, preferably Chinese ones — was developed *during* Phase 4. It did not
exist when the earliest pages shipped. Two corrections found incidentally
during Phase 5 were to our own older content, which suggested there were more.
There were.

## What the defects actually were

Sorted by the pattern that produced them, because the pattern is more useful
than the list.

### Claims that were true when written and expired

The largest and most dangerous category. Nothing about these looks wrong on
re-reading; they can only be caught by re-verifying against a current source.

- Metro Line 2 in Shanghai split at Guanglan Road until December 2018. The
  dedicated answer page still told readers to change trains there — seven
  years stale, and contradicting its own preceding paragraph.
- The departure VAT refund threshold fell from ¥500 to ¥200 in April 2025. We
  said ¥500 in three places, which tells a reader with a qualifying purchase
  that they do not qualify.
- Wikipedia was described as blocked "intermittently, varies by language".
  That was true 2015–2019. Since April 2019 every language edition is blocked
  outright.
- Canada joined the unilateral visa-free list on 17 February 2026. Our visa
  checker still told Canadians they needed a visa.
- Hainan and Heilongjiang were listed as outside the 240-hour transit zone.
  Both are inside it, since the December 2024 revision.

### Institutions that renamed, merged or relocated

Four caught. The Nanyue King museum merged in September 2021 and now spans two
sites in different parts of Guangzhou; the Hunan museum was renamed and then
renamed back; the Ningxia museum relocated in 2008.

### Venues that closed

Three caught, all still being recommended: 治德号, Baoye Road in Guangzhou
(stalls cleared in early 2023), and the Wangfujing snack street in Beijing
(closed 2019, stalls cleared — and we gave it a table row, a warning callout
and two FAQ mentions).

### Widespread English errors

Twenty by the end. The site now corrects, among others: 夫妻肺片 contains no
lung; classic 麻婆豆腐 uses beef; there is no 玉林路; 建水文庙 is third-largest
not second; the inscribed name is 西夏陵; 阳关 is not a World Heritage site
while 玉门关 and 悬泉置 are; Mogao has 735 caves of which 492 preserve
painting; UNESCO inscribed Gulangyu as "Kulangsu"; the eight cuisines reached
print in 1980, not the Qing; the oldest timber building is 南禅寺大殿 (782),
not 佛光寺 (857); the Temple of Heaven flanks Beijing's central axis rather
than sitting on it; the Marble Boat predates Cixi; Shenzhen was a county of
several hundred thousand, not a fishing village; Badaguan has ten streets
despite its name; the Potala has nine habitable floors, not thirteen, and
close to ten thousand rooms, not one thousand.

### Overstatement

Claims stated more confidently than any source supports. Yunnan was credited
with more plant species than the rest of the northern hemisphere combined; the
true figure — half of China's flora on 4 per cent of its land — is better.
Dark tea was called the only category that improves with age, which ignores
aged white tea.

## Two lessons that changed how the work was done

**Propagation is the rule, not the exception.** Every single pass found a
corrected claim surviving elsewhere. Pass 3's Wangfujing defect appeared four
times across two files; pass 5's plug error five times across two. Worse, pass
6 found that pass 1's own Hainan fix had left a survivor on the Sanya page,
because the guide was corrected without grepping the corpus. **Always grep the
whole corpus for a claim before fixing it, and again within the file being
fixed.**

**Facts boxes, standfirsts, descriptions and FAQ answers are where survivors
hide.** Six of nine passes found one there. They restate the body claim in
compressed form, they are easy to miss, and — for FAQ answers especially —
they feed FAQPage schema and can surface standalone in a search result,
detached from the prose that contradicts them. The eight-cuisines Qing error
survived on the very page that corrected it, in an FAQ that mentioned the date
in passing rather than asking about it.

## Things deliberately not changed

Recorded so they are not re-litigated.

- **Alipay Tour Pass.** Secondary sources say it is discontinued but contradict
  each other on the date, and Alipay's own service agreement carries no such
  notice. Nothing solid enough to assert.
- **Found 158, Shanghai.** Pandemic-era closures and reopenings are documented;
  permanent closure is not established.
- **Crouching Tiger's bamboo scenes near Hongcun.** Investigated expecting the
  usual confusion with Anji in Zhejiang. Mukeng Bamboo Sea is 4 km from
  Hongcun and is credited as a filming location by state media. Our claim is
  defensible and stands.
- **Cloudflare Browser Cache TTL.** `/assets/*` is served with `max-age=14400`
  although the build's `_headers` requests 3600, and `_headers` is otherwise
  honoured. This is a zone-level dashboard setting overriding the origin, not
  something the repository can change. Content-hashing the assets would route
  around it but needs a two-level import rewrite against a canonical path the
  build's comments explain is deliberate.

## Tooling added

- `npm run audit:transit` — `tools/extract-transit-claims.mjs` prints every
  metro, station, interchange and rail claim grouped by page. It asserts
  nothing and is not in `npm test`, because there is no machine-checkable
  ground truth for "does line 3 still serve this station". The value is in
  making the human review cheap. It is what surfaced the Mount Hua error.
- The CJK scan over added prose caught a bare Chinese architectural term in
  audit prose written during pass 8. It catches the auditor, not only the
  content.

## Why the audit stopped

Defects by pass: 9, 7, 4, 4, 1, 5, 6, 4, 0.

Raw yield held up longer than the character of the finds did. Passes 1–7
caught things that would have stranded a reader or cost them money. Pass 8
caught a miscounted storey and an inflated plant claim — real errors, lower
consequence. Pass 9 checked the regulatory answer pages, the plan pages and
the itineraries — the categories likeliest to still hold something
consequential — and found nothing, including several claims actively expected
to be wrong.

The pattern is explained by when pages were written. Everything produced from
Phase 4 onward carries the verification discipline and is holding up. The
audit's job was the pages that predate it, and those are now done.

---

# Freshness pass, round one

The nine-pass audit above is closed and stays closed. This is a different job:
re-verifying claims that were correct when the audit passed over them and may
not be now. The audit's own largest defect category was "claims that were true
when written and expired", and its own conclusion was that nothing about those
looks wrong on re-reading — they can only be caught by re-checking against a
current source. Nothing had done that since.

## How the tranche was chosen

Every page carries an `updated:` date, and there were only two: 59 pages at
2026-08-01 and 118 at 2026-08-19. So "oldest" is one tranche of 59, and age
alone could not rank it.

Ranked by decay risk instead — regulatory rules first, then prices and fees,
then schedules and opening hours, then institution names, then transport
times, then venue existence, with history and culture last. That put the visa
material at the top, and it is where both defects were.

## What was wrong

**The 240-hour transit list was missing seven nationalities.** The data behind
the interactive checker carried 48 codes against an official 55: Monaco,
Serbia, Bosnia and Herzegovina, Montenegro, North Macedonia, Albania and
Belarus. A Serbian or Belarusian passport holder was told they needed a visa
when they qualified for ten days visa-free.

**The Hainan list was missing twenty-three.** 36 codes against an official 59 —
most of the 2004-and-later EU accession states, the Balkans, Brunei, Monaco and
Belarus.

One consequence worth recording: Czechia and Lithuania are the only Schengen
states off the 30-day unilateral list, and the file told them so while omitting
that they are on the Hainan list. A Czech planning a Hainan beach trip was told
to get a visa they did not need. Their notes now say both things.

Sources: the full country lists published by the Chinese embassy in Suriname
and the consulate in Montreal for the transit scheme — which agree once
Indonesia's June 2025 addition is accounted for, 54 then and 55 now — and the
Chinese embassy in Canada with 海口本地宝 (Hǎikǒu Běndìbǎo) for Hainan. Both
diffs were clean subsets: nothing in the file was wrong, only absent, and the
additions land on exactly 55 and 59.

## The pattern, and it is the same one as PR #63

Three times now the *prose* has been right and the *data* wrong. The visa guide
said 50 unilateral nationalities while the checker offered 42 (#63); it said 55
transit and 59 Hainan while the checker carried 48 and 36 (this round). The
totals are checked when the guide is written; the arrays are not, because
nothing reads them but the tool.

Both times the missing entries were the same kind — small European states and
the Balkans, the ones secondary sources drop when they summarise a policy as
"the EU and the usual suspects". That is a predictable failure mode and worth
checking first next time.

**A count in prose and a list in code should be asserted against each other.**
Neither round would have needed a human eye if a test compared them.

## What came back clean

Re-verified and correct: the 55 and 59 totals in the visa guide, the Hainan
page, the first-time guide and the checker page; the 60 designated ports and 24
permitted provinces; Canada's 17 February 2026 addition; the Chinese New Year
dates for 2026 and 2027 on the best-time page.

## What this implies about cadence

Two real defects in the highest-decay category, both in machine-readable data
rather than prose, three weeks after the corpus was last touched wholesale.
Entry rules have moved roughly quarterly since 2023, so the visa data is worth
re-checking on that cadence rather than annually. The rest of the tranche —
prices, schedules, institution names, transport times — is untouched and is
where round two should go.
