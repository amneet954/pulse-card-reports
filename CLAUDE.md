# Pulse Card Reports — Product Context

This repository is a product-management portfolio project. The code exists to prove out the
product decisions in the case study, so build what is specified here and nothing more.

## Product

**Pulse** is a fictional B2B SaaS reporting company. It gives Yu-Gi-Oh card shop staff one place
to look up which cards belong to which box sets, instead of researching each card in a separate
browser tab.

**Problem:** card shop staff spend about 20 of 40 weekly work hours (50%) researching cards one at a
time on the Yu-Gi-Oh website. For each card they open a new tab, search it, and copy its name,
description, attributes and the products it was released in.

## Primary persona: Alex, cashier

Alex handles 40+ card requests a day at the counter. Customers ask for a card in a specific rarity,
sometimes from a specific set. Today Alex searches each card by hand and digs through its release
history while the customer waits.

- **Goal:** answer each request correctly in seconds
- **Must match:** card name, rarity and set
- **Device:** a tablet at the counter, so the UI must be fast, touch-friendly and readable

## Success metrics

| Metric | Baseline | Target |
| --- | --- | --- |
| Weekly research time per vendor | 20 hours | 5 hours |
| Time per card lookup at the counter | ~3 minutes | Under 30 seconds |

## Data source

Card data comes from the **YGOPRODeck API v7** (free, no key), but the app does NOT call the API
at runtime. `scripts/build-data.mjs` (run weekly by `.github/workflows/refresh-data.yml`) pulls
`cardsets.php` and `cardinfo.php` once and writes `data/catalog.json` (schema v2) as **three related
tables**:

- `cards`: `{ id, name, card_type (Monster|Spell|Trap), subtype, attribute (null for Spell/Trap), desc }`
- `sets`: `{ id, set_name, set_code (e.g. MFC), date, in_scope, booster }`
- `printings`: `{ card_id, set_id, code (e.g. MFC-000), rarity }` — joins a card to a box set

**v1 data scope:** every Monster (including Fusion and Ritual), Spell and Trap card printed in the first 11 TCG booster sets (LOB, MRD, SRL, PSV, LON,
LOD, PGD, MFC, DCR, IOC, AST) or in any side product released on or before AST's date, with all of
its printings to date. **English-language TCG printings only** (codes like LOB-001, LOB-E001,
LOB-A005, LOB-EN001); OCG and non-English TCG printings are excluded. Tokens and Skill Cards are
excluded because no English printings of either exist in this era (English Tokens start in 2008;
Skill Cards belong to Speed Duel, from 2018-19).

Rules:
- Do **not** use the `tcgplayer_data` parameter: YGOPRODeck says it cannot guarantee set names and
  rarities with it.
- Do **not** hotlink card images. Images are out of scope anyway.
- Keep the build to a couple of API requests; be polite to the free API.

## Must have (version 1)

1. **Data coverage:** the v1 data scope above (early-era Monster, Fusion, Ritual, Spell and Trap cards, every printing to date).
2. **English-language TCG products only**, from the era of the first 11 booster sets and the side
   products released in that period.
3. **Related data model:** cards and box sets are separate tables joined by printings, so a card
   search finds every box set it's in and a box set search finds every card in it.
4. **Metrics sidebar** with two groups; ticked metrics become the report's columns:
   - **Card:** Card name, Card type (Monster/Spell/Trap), Attribute, Card description, Card rarity,
     Card set code (the printing, e.g. MFC-000)
   - **Box set:** Box name, Box set code (e.g. MFC), Box year
   - **MVP report:** the core report Pulse is built around uses six metrics: Card name, Card type,
     Card rarity, Card set code, Box name and Box year. Try an example runs exactly this report.
5. **Filter (optional)**: one box with a **Card / Box set toggle** and **type-ahead suggestions** that
   ignore punctuation and spacing ("red eyes" finds "Red-Eyes Black Dragon"). Leaving it empty runs
   the report on the whole catalog (e.g. Box set metrics alone list every box set).
6. Filter by **several cards or box sets at once** (up to 20; pasting a list works).
7. **One report table:** each row is a printing projected onto the chosen metrics; identical rows
   are merged.
   - **Sortable columns:** a sort icon on every header toggles ascending / descending (natural sort
     for years and set codes; blanks last).
   - **50-row screen limit (deliberate design limitation):** any report shown in the UI, including
     Try an example, displays at most 50 rows, with a note to export the full report as CSV. The
     CSV export is the only way to get every row. Do not raise or remove this limit.
8. Results in **under 2 seconds**, usable on a tablet.
9. **View results on screen and export to CSV** (same columns and sort order as the screen; CSV has every row).

## Should have
- Full, up-to-date catalog: every set and every card, including cards first released in later
  years (e.g. 2022 or 2026). When building it, decide whether to include Tokens (English printings
  from 2008) and Skill Cards (Speed Duel).

## Could have
- OCG products and non-English printings (Japanese, Asian-English, French, German, Italian, Spanish, Portuguese)
- Card and box prices (current market value from `set_price` / `card_prices`)
- Search-demand analytics (how often a card, set and rarity were requested)
- "Try an example" button, to help new users get started (built in v1.64: runs the MVP report —
  Card name, Card type, Card rarity, Card set code, Box name, Box year — filtered to Quarter
  Century Stampede)

## Won't have (this time)
- 1st Edition vs. Unlimited, and telling reprints apart
- Alternate art labels, or artwork images per printing
- How card wording changed over time
- Inventory tracking
- Restock locations
- Buying, selling or pricing workflows

## Versioning
- Bump `VERSION` in `app.js` and add a `CHANGELOG.md` entry (what changed, why, what was left out)
  for every release. **The product owner sets version numbers:** stay on the current version
  (v1.64) and record changes as hotfixes under it until told to move to the next one.
- Commit messages explain what changed and why, in the same terms as the changelog.

## Technical constraints
- Static site with no backend and no build step, hosted on **GitHub Pages** from the `main` branch
  root (Settings → Pages → Deploy from a branch → `main` / root).
- Plain HTML/CSS/JavaScript — keep it simple for a non-engineer owner.
- A small built-in sample dataset (`sample-data.js`) keeps the app demoable if `data/catalog.json`
  can't load (e.g. opened from disk); the UI shows a banner when sample data is in use.
- `README.md` is written for interviewers: what the product is, who it's for, and how the Must haves
  map to features.

## Code layout
- `index.html` — page structure
- `styles.css` — styles (tablet-first, 44px touch targets)
- `app.js` — data model, matching, metrics (`METRICS`), reports, CSV export, UI. The pure logic is exported for Node tests.
- `data/catalog.json`, `data/meta.json` — generated card data (do not edit by hand)
- `scripts/build-data.mjs` — builds the data from YGOPRODeck
- `sample-data.js` — fallback data (3 real cards; not complete)
- `CHANGELOG.md` — release history
