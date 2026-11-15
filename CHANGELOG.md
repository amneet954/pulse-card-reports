# Changelog

Every release of Pulse Card Reports, newest first. Each entry says what changed, why
(the product reason), and what was deliberately left out. Commit messages carry the same detail.

## v1.1 — 2026-11-15

**Theme:** make search work the way a cashier actually searches, and cover a real catalog.

### Added
- **Card data for the v1 scope (Must have).** Every monster printed in the first 11 booster sets
  (Legend of Blue Eyes White Dragon to Ancient Sanctuary, March 2002 to June 2004), or in a side
  product released by Ancient Sanctuary's date: starter decks, tins, tournament packs and promos.
  Each monster includes **all of its printings to date**, so a 2002 card's 2014 or 2026 reprints
  show up. That's 852 monsters, 383 sets and 4,975 printings in the first build.
- **Weekly data refresh.** A GitHub Actions workflow rebuilds `data/cards.json` from the YGOPRODeck
  API every Monday, so new reprints of covered monsters appear without a code change.
- **Type-ahead suggestions (moved from Should to Must).** Results narrow as you type. Matching
  ignores punctuation and spacing, so "red eyes", "red-eyes" and "redeyes" all find Red-Eyes Black
  Dragon. Similar names are listed together (Dark Magician, Dark Magician Girl, Dark Magician of Chaos).
- **Release date for every printing (moved from Should to Must).** Needed to tell a 2002 printing
  from a 2023 one, which is the point of showing reprint history.
- **Optional filters.** Rarity and set filters now sit behind "+ Add filter" instead of always showing.

### Changed
- **One search box instead of two tabs.** A Card / Box set toggle sits next to a single search box.
  Picked results become chips, and one report can mix cards and box sets.
- **The app reads from the bundled dataset** instead of calling the API on each search, so reports
  build in milliseconds and don't depend on the API being reachable from the shop's tablet.
- **One CSV format** for every report, with a `search_type` column and the release date.
- Box set descriptions sit behind a small ⓘ toggle, so long set lists stay easy to scan.

### Not included (kept in the PRD)
- **Full catalog of every set and monster through today:** Should have.
- **"Did you mean" suggestions for misspellings** like "blak magician": Could have. Type-ahead covers
  partial names and punctuation, which handles most counter searches.
- **Spell and Trap cards:** Won't have (this time). Version 1 covers monsters only.

## v1.0 — 2026-11-14

**Theme:** first working version of the PRD's Must haves.

### Added
- Search by card name, box set name or set code, up to 20 at a time.
- Card report: each card with every box set it appears in, with set code and rarity.
- Box set report: each box set with every card in it, with description, rarity and set code.
- Rarity and set filters for card results.
- CSV export and Copy CSV.
- A timer on every report, tied to the "under 30 seconds per lookup" goal.
- Live lookups against the YGOPRODeck API, with a 3-card sample fallback.
