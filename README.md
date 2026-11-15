# Pulse Card Reports

**Live app:** https://amneet954.github.io/pulse-card-reports/

A product management case study, built end to end: discovery, persona, success metrics,
a MoSCoW-prioritized PRD, and a working version 1.

## The problem

Yu-Gi-Oh card shop staff spend about **20 of their 40 weekly work hours** researching cards one at a
time: a new browser tab per card, then digging through each card's release history to find which
box sets it appeared in, and at what rarity.

**Pulse** (a fictional B2B SaaS reporting company) gives them one report covering many cards at once.

## Who it's for

**Alex, cashier.** Handles 40+ card requests a day at the counter. Customers ask for a card in a
specific rarity, sometimes from a specific set, and wait while Alex looks it up.

## Success metrics

| Metric | Baseline | Target |
| --- | --- | --- |
| Weekly research time per vendor | 20 hours | 5 hours |
| Time per card lookup at the counter | ~3 minutes | Under 30 seconds |

The app shows how long each report took to build, so the lookup-time metric is visible in every
search.

## What version 1 does (Must haves)

| Requirement | In the app |
| --- | --- |
| Search by card name, box set name or set code | Two report modes; set codes like `MFC` or `SDK` work |
| Search several cards or sets in one query | One per line (or comma-separated), up to 20 |
| Filter card results by rarity and set | Rarity and set filters in card mode |
| Box set view with description, rarity and set number | Box set report lists every printing in the set |
| Fast, usable on a tablet | No backend, cached lookups, 44px touch targets |
| View on screen and export to CSV | Export CSV and Copy CSV buttons |

## What it deliberately doesn't do (Won't have, this time)

1st Edition vs. Unlimited, alternate art labels, per-printing artwork, wording history, inventory
tracking, restock locations, and pricing workflows. Each was cut for a stated reason, mostly data
reliability or because it serves a different persona. See `CLAUDE.md` for the full MoSCoW list.

## Data

Card data comes from the free [YGOPRODeck API](https://ygoprodeck.com/api-guide/). Its optional
TCGplayer data mode was rejected because YGOPRODeck can't guarantee its set names and rarities.
If the API is unreachable, the app falls back to a small built-in sample and says so on screen.

## Run it locally

Open `index.html` in a browser. There is no build step.

---
Pulse is fictional. Not affiliated with Konami or YGOPRODeck.
