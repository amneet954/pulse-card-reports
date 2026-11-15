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
| Cover the early era | 1,398 Monster (including Fusion and Ritual), Spell and Trap cards from the first 11 booster sets (2002–2004) and their side products, with every printing to date |
| English TCG products | English-language TCG printings only (North American, European/Australian English and EN codes) |
| Related data model | Cards and box sets are separate tables joined by printings (`data/catalog.json`) |
| Metrics sidebar | Pick columns from two groups: **Card** (name, type, attribute, description, rarity, set code) and **Box set** (name, set code, box year) |
| Optional filter, cards or box sets | One box with a Card / Box set toggle and type-ahead ("red eyes" finds Red-Eyes Black Dragon). Leave it empty to report on the whole catalog |
| Filter by several at once | Add up to 20 cards and box sets, or paste a list |
| Card rarity filter (Should have) | "Card rarity is / is not" with typed, case-insensitive values as chips (e.g. is Common, Ultra Rare) |
| One report table | Each row is a printing reduced to the chosen metrics; duplicate rows merge |
| Work with the table | Sort any column up or down. By design, the screen shows at most 50 rows; the CSV export has them all |
| MVP report and Try an example | The core report uses six metrics: card name, card type, rarity, set code, box name and box year. Try an example runs it for Quarter Century Stampede |
| Fast, usable on a tablet | Reports build in milliseconds from bundled data; 44px touch targets |
| View on screen and export to CSV | Export CSV and Copy CSV, with the same columns as the screen |

## What it deliberately doesn't do (Won't have, this time)

1st Edition vs. Unlimited, alternate art labels, per-printing artwork, wording
history, inventory tracking, restock locations, and pricing workflows. Each was cut for a stated
reason, mostly data reliability or because it serves a different persona. See `CLAUDE.md` for the
full MoSCoW list and `CHANGELOG.md` for what changed in each version.

## Data

Card data comes from the free [YGOPRODeck API](https://ygoprodeck.com/api-guide/). A GitHub Actions
workflow (`.github/workflows/refresh-data.yml`) runs `scripts/build-data.mjs` every Monday and
commits `data/catalog.json` when anything changed, so new reprints appear automatically. The app
reads that file instead of calling the API on every search. YGOPRODeck's optional TCGplayer data
mode was rejected because YGOPRODeck can't guarantee its set names and rarities.

## Run it locally

From the repository folder, run `python3 -m http.server` and open http://localhost:8000. There is
no build step. Opening `index.html` directly shows a 3-card sample, because browsers block loading
the data file from disk.

---
Pulse is fictional. Not affiliated with Konami or YGOPRODeck.
