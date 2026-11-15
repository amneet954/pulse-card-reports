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
`cardsets.php` and `cardinfo.php` once and writes `data/cards.json`:

- `scope`: the 11 booster sets and the era end date (Ancient Sanctuary's release)
- `sets`: `{ set_name, set_code, date, in_scope, booster }` for every set a covered card appears in
- `cards`: `{ id, name, type, desc, printings: [{ set_name, set_code, rarity, date }] }`, printings oldest first

**v1 data scope:** every Monster (including Fusion and Ritual), Spell and Trap card printed in the first 11 TCG booster sets (LOB, MRD, SRL, PSV, LON,
LOD, PGD, MFC, DCR, IOC, AST) or in any side product released on or before AST's date, with all of
its printings to date. Tokens and Skill Cards are excluded.

Rules:
- Do **not** use the `tcgplayer_data` parameter: YGOPRODeck says it cannot guarantee set names and
  rarities with it.
- Do **not** hotlink card images. Images are out of scope anyway.
- Keep the build to a couple of API requests; be polite to the free API.

## Must have (version 1)

1. **Data coverage:** the v1 data scope above (early-era Monster, Fusion, Ritual, Spell and Trap cards, every printing to date).
2. **One search box** with a **Card / Box set toggle**; one report can include both.
3. **Type-ahead suggestions** that narrow as you type and ignore punctuation and spacing
   ("red eyes" finds "Red-Eyes Black Dragon").
4. Search **several cards or box sets at once** (up to 20; pasting a list works).
5. **Optional filters** behind "+ Add filter": rarity and set name/code, for card results.
6. **Card report:** each card with every printing — set code, box set, rarity, release date.
7. **Box set report:** each box set with every covered card — set code, card, rarity, description.
8. Results in **under 2 seconds**, usable on a tablet.
9. **View results on screen and export to CSV.**

## Should have
- Full, up-to-date catalog: every set and every card, including cards first released in later
  years (e.g. 2022 or 2026)

## Could have
- Card and box prices (current market value from `set_price` / `card_prices`)
- Search-demand analytics (how often a card, set and rarity were requested)

## Won't have (this time)
- 1st Edition vs. Unlimited, and telling reprints apart
- Alternate art labels, or artwork images per printing
- How card wording changed over time
- Inventory tracking
- Restock locations
- Buying, selling or pricing workflows

## Versioning
- Bump `VERSION` in `app.js` and add a `CHANGELOG.md` entry (what changed, why, what was left out)
  for every release.
- Commit messages explain what changed and why, in the same terms as the changelog.

## Technical constraints
- Static site with no backend and no build step, hosted on **GitHub Pages** from the `main` branch
  root (Settings → Pages → Deploy from a branch → `main` / root).
- Plain HTML/CSS/JavaScript — keep it simple for a non-engineer owner.
- A small built-in sample dataset (`sample-data.js`) keeps the app demoable if `data/cards.json`
  can't load (e.g. opened from disk); the UI shows a banner when sample data is in use.
- `README.md` is written for interviewers: what the product is, who it's for, and how the Must haves
  map to features.

## Code layout
- `index.html` — page structure
- `styles.css` — styles (tablet-first, 44px touch targets)
- `app.js` — matching, reports, CSV export, UI. The pure logic is exported for Node tests.
- `data/cards.json`, `data/meta.json` — generated card data (do not edit by hand)
- `scripts/build-data.mjs` — builds the data from YGOPRODeck
- `sample-data.js` — fallback data (3 real cards; not complete)
- `CHANGELOG.md` — release history
