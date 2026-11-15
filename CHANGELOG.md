# Changelog

Every release of Pulse Card Reports, newest first. Each entry says what changed, why
(the product reason), and what was deliberately left out. Commit messages carry the same detail.

## v1.4 — 2026-11-15

**Theme:** make the filters as easy as the search.

### Changed
- **Rarity filter fills in from the selected cards (Must have).** Instead of an "All rarities"
  dropdown, the filter shows every rarity the added cards were printed in, as tap-to-select
  buttons. Adding Dark Magician shows its 17 rarities; adding Dark Magician Girl adds hers (19 in
  total). Pick several at once; pick none to see every rarity.
- **Set filter has type-ahead (Must have).** Typing "magicians" or "MFC" suggests
  "Magician's Force (MFC)": the set name with its set code in parentheses. Suggestions are limited
  to sets the added cards appear in, or every set if no card is added yet. Several sets can be
  picked; each shows as a removable chip.

### Why
Typing a rarity or set exactly right is slow at the counter. Showing only the options that exist
for the chosen cards removes guesswork and dead-end filters.

## v1.3 — 2026-11-15

**Theme:** make the language and region scope explicit.

### Changed
- **English-language TCG printings only (Must have).** Version 1 covers English TCG products
  from the era of the first 11 booster sets and their side products: North American codes
  (LOB-001), European and Australian English (LOB-E001, LOB-A005) and EN codes (LOB-EN001).
  The 43 Portuguese OTS Tournament Pack printings that the source lists are now filtered out.
  Coverage: 1,398 cards, 461 sets and 9,163 printings.
- **Corrected why Tokens and Skill Cards are excluded.** v1.2 said they "aren't sold in booster
  sets." The accurate reason: no English printings of either exist in the covered era. English
  Tokens start with the Token Packs in 2008; Skill Cards belong to Speed Duel, from 2018–19.

### Added to the PRD (not built)
- **Could have:** OCG products and non-English printings.
- **Should have note:** decide on Tokens and Skill Cards when building the full catalog.

## v1.2 — 2026-11-15

**Theme:** cover the whole card pool of the early era, not just monsters.

### Added
- **Spell and Trap cards (moved from Won't have to Must have).** The data now covers every
  Monster, Spell and Trap card printed in the first 11 booster sets or their side products, with
  every printing to date: 1,398 cards (852 monsters, 326 Spells, 220 Traps), 475 sets and 9,210
  printings.
- **Fusion monsters named in scope.** They were already included (43 of them, such as Thousand
  Dragon and Dark Paladin); the PRD now lists them explicitly, along with Ritual monsters.
- Each card's type (Monster, Fusion Monster, Spell, Trap...) shows in suggestions and reports.

### Changed
- Text across the app says "card" instead of "monster".

### Not included
- Tokens and Skill Cards. (The reason given here was corrected in v1.3.)

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
- **Full catalog of every set and card through today:** Should have.
- **Spell and Trap cards:** Won't have at the time; moved to Must have and shipped in v1.2.

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
