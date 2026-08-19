---
title: Does Google Maps Work in China?
question: Does Google Maps work in China?
navTitle: Google Maps in China
metaTitle: "Does Google Maps Work in China? Not Usefully — Use Amap"
description: No. It is blocked, and even over a VPN Chinese law forces a coordinate offset that puts roads and satellite imagery out of alignment. Use Amap or Apple Maps.
standfirst: No, and the block is the smaller of its two problems. Even reached over a VPN, Google Maps is close to unusable in mainland China because Chinese law requires published maps to use an **offset coordinate system**, so the road layer and the satellite imagery do not line up with each other or with your GPS position.
eyebrow: Answer
order: 65
updated: 2026-08-19
keywords: [does google maps work in china, amap english, china map offset, gcj-02, best map app china]
related:
  - /guides/internet-vpn-apps-china/
  - /guides/transport-in-china/
  - /answers/is-google-blocked-in-china/
---

This is the one blocked service people try hardest to work around, and the one where the workaround fails even when it succeeds.

## The offset, which is the real problem

China's surveying and mapping law requires every map published for mainland China to use **GCJ-02**, a coordinate system derived from the global WGS-84 standard with a deliberate, location-dependent distortion applied. Your phone's GPS reports true WGS-84 positions. Chinese map data is drawn in GCJ-02. The gap between them is typically a few hundred metres and varies from place to place, so it cannot be corrected by eye.

The visible symptom on Google Maps is that **the street layer and the satellite imagery disagree**. Google renders China's roads in the mandated system and its satellite tiles in the global one, so switch between them and the city moves — roads run through rivers, and buildings sit in the wrong block. Whatever your VPN does, it cannot fix that.

Domestic apps have no such problem, because everything they use is already in the same system.

## The second problem: the data is thin

Google has had no mainland operation since 2010, so beyond the geometry the content has aged badly. Business listings are sparse or long closed, opening hours are absent, and public-transport routing does not reflect a metro network that has added lines every year since. A map that cannot tell you whether a restaurant still exists is not much of a map.

## What to use instead

**Amap** (高德地图, Gāodé Dìtú) is the one to install. It has an English interface, it is the app most local people use, and its transit directions — metro exits included — are exact. Search in English works for major sights; for anything else, paste the Chinese name.

**Apple Maps** works normally on a Chinese connection, is in English by default, and is accurate because it licenses Chinese data. On an iPhone it is the zero-effort option and is good enough for most of a trip.

**Baidu Maps** is the other domestic giant. It is excellent and almost entirely in Chinese, so it is the third choice for a visitor rather than the first.

## Do this before you fly

- **Install Amap at home.** Once you land you may not be able to download anything from the Play Store at all.
- **Save your hotel's name and address as a screenshot in Chinese characters.** It works with no signal, no data and a driver who does not read Latin script.
- **Download offline maps** in whichever app you settle on, for every city on your route.

## The habit worth changing

Foreign visitors reach for Google Maps reflexively and then conclude Chinese navigation is hard. It is not — it is just somewhere else. An hour spent setting up Amap before departure buys back the whole trip's worth of standing on street corners.

For the full app set and what else the firewall reaches, see the [guide to internet, VPNs and apps in China](/guides/internet-vpn-apps-china/); for metro, rail and taxi practicalities, the [guide to transport in China](/guides/transport-in-china/).
