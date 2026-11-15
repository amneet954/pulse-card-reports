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
| Cover the early era | 852 monsters from the first 11 booster sets (2002–2004) and their side products, with every printing to date |
| One search, cards or box sets | A single search box with a Card / Box set toggle; one report can mix both |
| Type-ahead suggestions | Results narrow as you type; "red eyes" finds Red-Eyes Black Dragon |
| Search several at once | Add up to 20 cards and box sets, or paste a list |
| Filter card results by rarity and set | Optional, behind "+ Add filter" |
| Release date per printing | Tells a 2002 printing from a 2023 reprint |
| Box set view with description, rarity and set number | Every covered monster in the set |
| Fast, usable on a tablet | Reports build in milliseconds from bundled data; 44px touch targets |
| View on screen and export to CSV | Export CSV and Copy CSV buttons |

## What it deliberately doesn't do (Won't have, this time)

Spell and Trap cards, 1st Edition vs. Unlimited, alternate art labels, per-printing artwork, wording
history, inventory tracking, restock locations, and pricing workflows. Each was cut for a stated
reason, mostly data reliability or because it serves a different persona. See `CLAUDE.md` for the
full MoSCoW list and `CHANGELOG.md` for what changed in each version.

## Data

Card data comes from the free [YGOPRODeck API](https://ygoprodeck.com/api-guide/). A GitHub Actions
workflow (`.github/workflows/refresh-data.yml`) runs `scripts/build-data.mjs` every Monday and
commits `data/cards.json` when anything changed, so new reprints appear automatically. The app
reads that file instead of calling the API on every search. YGOPRODeck's optional TCGplayer data
mode was rejected because YGOPRODeck can't guarantee its set names and rarities.

## Run it locally

From the repository folder, run `python3 -m http.server` and open http://localhost:8000. There is
no build step. Opening `index.html` directly shows a 3-card sample, because browsers block loading
the data file from disk.

---
Pulse is fictional. Not affiliated with Konami or YGOPRODeck.
