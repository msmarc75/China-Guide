#!/usr/bin/env node
/**
 * The sidebar partner slot is chosen from the page's topic. These assertions
 * pin the cases that were wrong before the picker existed, or that broke it:
 *
 *   - every page defaulted to `tours`, so eSIM pages advertised day trips
 *   - `bus` matched inside "business card", sending etiquette pages to rail
 *   - `visa` the card brand matched `visa` the document, sending ATM pages
 *     to a visa service
 *
 * Run: node tools/test-aside-partner.mjs
 */
import { pickAsidePartner } from '../src/lib/aside-partner.mjs';

let failures = 0;
const check = (label, got, expected) => {
  const ok = expected.startsWith('!') ? got !== expected.slice(1) : got === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${label} → ${got}${ok ? '' : ` (expected ${expected})`}`);
};

const page = (title, keywords, sectionId = 'answers') => ({ title, keywords, sectionId });

console.log('Sidebar partner matching');

check('explicit front matter wins',
  pickAsidePartner({ title: 'Anything', asidePartner: 'insurance', sectionId: 'answers' }), 'insurance');

check('eSIM routing page',
  pickAsidePartner(page('Does an eSIM Bypass the Great Firewall in China?', ['china esim', 'vpn'])), 'esim');

check('airport transfer page',
  pickAsidePartner(page('How Do I Get from Shanghai Pudong Airport to the City?', ['pudong airport', 'metro line 2'])), 'trains');

check('where-to-stay beats an incidental station mention',
  pickAsidePartner(page("Where Should I Stay in Xi'an?", ['where to stay in xian', 'xian north railway station'])), 'hotels');

check('tap water page goes to insurance',
  pickAsidePartner(page('Is Tap Water Safe in China?', ['tap water china', 'is it safe'])), 'insurance');

console.log('\nFalse positives that shipped once');

check('"business card" must not match the rail signal "bus"',
  pickAsidePartner(page('Do People Bow in China?', ['china business card etiquette', 'how to greet chinese people'])), '!trains');

check('Visa the card brand is not visa the document',
  pickAsidePartner(page('Can I Use My Credit Card in China?', ['credit card china', 'visa mastercard china'])), '!visa');

check('debit card / ATM page is not a visa page',
  pickAsidePartner(page('Will My Debit Card Work at Chinese ATMs?', ['china atm foreign card', 'visa mastercard'])), '!visa');

check('a genuine visa page still matches',
  pickAsidePartner(page('Do I Need a Visa for China?', ['china visa', 'entry requirements', 'passport'])), 'visa');

console.log(failures ? `\n${failures} failure(s).` : '\n✓ All sidebar partner assertions passed.');
process.exit(failures ? 1 : 0);
