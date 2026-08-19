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

## Round two

Ranked the remaining 2026-08-01 tranche by price density and took the top of
it, plus the schedule and institution-name claims. Two defects, both propagated.

**The exchange rate had drifted 5.3%, and twenty conversions with it.** The
budget page declared ¥7.1 to the US dollar. Spot on 19 August 2026 was ¥6.73
(Trading Economics and exchange-rate aggregators agreeing), the yuan having
strengthened about six per cent over the year. Every US dollar figure on the
site therefore overstated the cost of a China trip by roughly five per cent,
across six files: the budget page, the first-time guide and all four
itineraries. Recomputed at ¥6.75 and the euro line corrected to ¥7.8.

**The Shanghai Museum's two buildings close on different days.** The site said
"closed Mondays" in eight places. That is right for the People's Square
building (09:00–17:00, closed Monday) and wrong for Shanghai Museum East
(10:00–18:00, closed **Tuesday**) — which our own Shanghai page describes as
"larger and increasingly the main site". A reader planning around Monday would
have been sent to the East building on the one day it is shut. Confirmed
against 上海本地宝 (Shànghǎi Běndìbǎo) and the museum's own listings.

### The test that came out of it

Twenty derived numbers, one source figure, no link between them — the same
shape as round one's visa defect. So `npm run test:currency` now checks every
`¥X (US$Y)` pair in the corpus against one declared rate.

It does not check that the rate is current; no offline test can. It checks that
if the rate is updated, every conversion is updated with it, and names each one
that is not.

**Setting the tolerance taught something worth recording.** I chose 10% by
intuition, then sabotaged a figure to confirm the test worked — and it did not:
the 5.3% error, the exact defect it was written for, sailed through. Measuring
the real rounding drift across the corpus gave 0.44%, so the tolerance is now
2%. A test whose threshold is guessed rather than measured can be decorative
without anyone noticing.

### The pattern across both rounds

Both rounds found the same failure mode rather than two different ones: **a
figure stated once in prose, values derived from it by hand, and nothing
connecting them.** Visa totals against scheme arrays in round one; an exchange
rate against twenty conversions in round two. Both are now asserted.

Worth looking for more of these than for individually stale facts. The question
to ask of any number on the site is not "is this still true" but "what else was
computed from this, and would anything notice if it changed".

## Round three

Round one went at machine-readable data and round two at derived numbers.
Round three went at the category no test can reach: **named institutions,
venues and stations, where the world changes and the file does not.** Twenty-one
named museums across the destination and itinerary pages, every "no metro"
claim in the corpus, and a sample of the named establishments in the four city
restaurant and nightlife pages.

Two defects, both about *where a thing is* rather than whether it exists — and
both of a shape the earlier rounds could not have found, because every
individual fact in them was true.

**The Fuchun Mountains fragment is not at the museum by the lake.** The
Hangzhou page listed the Zhejiang Provincial Museum under "Beyond the lake",
between Lingyin Temple and the Six Harmonies Pagoda, as the holder of the burnt
opening fragment of Huang Gongwang's scroll. Every clause was true and the
placement was wrong. The museum has been split across campuses since the
Zhijiang campus (之江馆区) opened inside the Zhijiang Culture Centre on
29 August 2023, across the river from West Lake; the lakeside Gushan campus
(孤山馆区, 杭州市西湖区孤山路25号) is the one a visitor walking the Bai Causeway
will reach, and the fragment is not in it. Nor is it on permanent display
anywhere — since the new building opened it has been shown for about a month a
year (30 August–end September 2024; 11 November–7 December 2025). Confirmed
against 杭州本地宝 (Hángzhōu Běndìbǎo) campus guides and Chinese Wikipedia's
之江文化中心 entry, which also records that metro line 6's 之浦路站 was renamed
之江文化中心站 on 1 February 2024. Fixed on the Hangzhou page and on
/answers/how-should-i-look-at-a-chinese-handscroll/.

**Lintong has had a metro since 2020; our page said it had none.** The Xi'an
things-to-do page told readers the Terracotta Army is "in Lintong district,
well east of the city, with no metro connection". Xi'an metro **line 9** opened
on 28 December 2020, runs 纺织城 to 秦陵西 across fifteen stations, and serves
Lintong — including a station called Qinling West, Qin Mausoleum West, which
reads exactly like the destination and is not it. The practical advice on the
page (take bus 5/306) was right; the reason given for it was wrong, in a way
that a reader looking at a metro map would catch and disbelieve. No station on
line 9 serves the museum and every route from the line needs a local bus, so
the corrected text names the line, names the trap and keeps the bus. Confirmed
against 西安本地宝 (Xī'ān Běndìbǎo) and Chinese Wikipedia's 西安地铁9号线 entry.
The two sources disagree on the distance from 秦陵西站 to the museum (5.8 km
against about 3 km), so no distance is stated. Fixed on the things-to-do page,
its table row, and /answers/how-do-i-get-to-the-terracotta-army-from-xian/.

**One placement note rather than a defect.** The Yunnan page listed the Yunnan
Provincial Museum alongside Green Lake Park as a Kunming afternoon. The museum
moved to 昆明市官渡区广福路6393号 in Guandu district on 18 May 2015 and no metro
station serves it — the transfer is line 1 plus a bus. Travellers are given one
night in Kunming, so the location now appears with the recommendation.
Confirmed against 昆明本地宝 (Kūnmíng Běndìbǎo) and Chinese Wikipedia.

### What came back clean

- **Quanzhou still has no metro.** The six planned lines were never built; the
  厦漳泉 R1 intercity line began construction in 2025 and is not open.
  (泉州本地宝 and Tencent News.)
- **Nanputuo Temple still has no metro.** The Xiamen line 3 southern extension
  through 沙坡尾 and 厦大 is under construction with an expected end-2026
  opening, so the claim holds — and is the next one to expire.
- **Kaifeng, Jianshui, Kashgar, Dunhuang and Yinchuan.** All still without
  metro; the Yinchuan monorail note is still accurate.
- **The Shaanxi History Museum** is still at 小寨东路91号 on lines 2 and 3. Its
  秦汉馆 branch, opened 18 May 2024, is a separate site in 西咸新区, which does
  not affect the entry.
- **The Suzhou Silk Museum** is still free (since 1 October 2013) at 人民路2001号.
- **The 老字号 restaurants** sampled — 上海老饭店 at 福佑路242号 (reopened January
  2023 after a ten-month refit) and 老孙家 at 北院门86号 — are trading at the
  addresses given.

### Why the venue category came back clean, and what that means

Three defunct venues were caught in the nine-pass audit, so venues were ranked
second this round. They yielded nothing, and the reason is structural rather
than lucky: the restaurant pages were built on 老字号 (lǎozìhào) time-honoured
brands and the Shanghai nightlife page names districts instead of bars, on the
explicit ground that "a bar list written a year ago is a list of places that may
not exist". The earlier defects were what forced that choice. A page built to
decay slowly does not need re-checking as often — which is an argument for
writing them that way, not for checking them harder.

(One slip fixed in passing: the Shanghai nightlife page said Alipay works "in
small hutong-scale places". Hutong are Beijing; Shanghai has lane houses.)

### Is round four worth running?

Not on this seam. Three rounds have now found six defects, and the yield has
changed character rather than falling off: rounds one and two found figures
that were flatly wrong, round three found only facts that were true and
misplaced. Institutions and transport are where the remaining decay is, and
both were swept corpus-wide this round rather than page by page — every "no
metro" claim and every named museum, not a sample. A fourth round over the same
ground would be re-reading what was just read.

The cadences worth keeping are the ones round one established: visa data
quarterly, the exchange rate whenever `test-currency.mjs` is touched, and the
metro claims annually — with Xiamen's flagged for end-2026, because that one
has a known expiry date rather than an unknown one.
