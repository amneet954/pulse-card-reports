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

Use the **YGOPRODeck API v7** (free, no key): `https://db.ygoprodeck.com/api/v7/`

- `cardinfo.php` — card search. Useful params: `name` (exact), `fname` (fuzzy/partial), `cardset`.
  Each card returns `name`, `desc`, `type`, `attribute`, and a `card_sets` array of
  `{ set_name, set_code, set_rarity, set_rarity_code, set_price }`.
- `cardsets.php` — every set, with `set_name`, `set_code` (prefix, e.g. `MFC`), `num_of_cards`, `tcg_date`.
- `cardsetsinfo.php?setcode=MFC-000` — details of one printing.

Rules:
- Do **not** use the `tcgplayer_data` parameter: YGOPRODeck says it cannot guarantee set names and
  rarities with it.
- Do **not** hotlink card images. Images are out of scope anyway.
- Cache responses in memory and debounce searches; be polite to the free API.
- Verify the response shapes above against the live API before relying on them, and handle errors
  (no results returns an `error` field).

## Must have (version 1)

1. Search by **card name**, **box set name**, or **set code prefix** (e.g. `MFC`).
2. Search **several cards or box sets in one query** (e.g. one per line, or comma-separated).
3. **Filter card results by rarity and set.**
4. **Search by card** report: one row per card — card name, then a list of the box sets it appears
   in, each with set code and rarity.
5. **Search by box set** report: one row per box set — box name, then a list of every card in it,
   each with current description, rarity and set code (e.g. `MFC-000`).
6. Results in **under 2 seconds**, usable on a tablet.
7. **View results on screen and export to CSV.**

## Should have
- Autocomplete that tells similar names apart (Dark Magician vs. Dark Magician Girl vs. Dark Magician of Chaos)
- Release date for each set (`tcg_date`), to tell a 2002 printing from a 2023 one

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

## Technical constraints
- Static site with no backend and no build step, hosted on **GitHub Pages** from the `main` branch
  root (Settings → Pages → Deploy from a branch → `main` / root).
- Plain HTML/CSS/JavaScript — keep it simple for a non-engineer owner.
- A small built-in sample dataset (`sample-data.js`) keeps the app demoable if the API is
  unreachable; the UI shows a banner when sample data is in use.
- `README.md` is written for interviewers: what the product is, who it's for, and how the Must haves
  map to features.

## Code layout
- `index.html` — page structure
- `styles.css` — styles (tablet-first, 44px touch targets)
- `app.js` — data sources, report logic, CSV export, UI. The pure logic is exported for Node tests.
- `sample-data.js` — offline fallback data (a few real printings; not complete)
