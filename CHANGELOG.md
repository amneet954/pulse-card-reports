# Changelog

Every release of Pulse Card Reports, newest first. Each entry says what changed, why
(the product reason), and what was deliberately left out. Commit messages carry the same detail.

## v1.66 — 2026-11-16

**Theme:** cover the whole original era, through Extreme Victory.

### Changed
- **Data scope expanded (Must have).** v1 now covers every English TCG product released on or
  before **Extreme Victory (May 2011)**: core sets, side sets, starter and structure decks, tins,
  tournament packs and promos. Before, it stopped at Ancient Sanctuary (June 2004). Extreme
  Victory is the last set before Xyz monsters, so Generation Force and the 2011 tins are out.
  Coverage went from 1,398 to **4,436 cards** (2,798 Monsters incl. Fusion, Ritual and Synchro;
  893 Spells; 744 Traps; 1 Token), **763 box sets** and **20,769 printings**.
  New in reach: Vorse Raider (Collectible Tins 2005), Stardust Dragon (Collectible Tins 2008),
  Shooting Star Dragon and Red Nova Dragon (Collectible Tins 2010), and sets like Light of
  Destruction (2008).
- **Tokens are a fourth card type** (Monster / Spell / Trap / Token).
- Footer coverage note updated.

### Hotfix (still v1.66)
- **The grouped filter now groups.** With "Only box sets with all of these cards" on, the report
  has **one row per box set and rarity**, and **Card name is an array of strings** listing the
  cards printed there at that rarity, alphabetically: e.g. Legend of Blue Eyes White Dragon,
  Ultra Rare, ["Blue-Eyes White Dragon", "Dark Magician"]. Dark Magician + Blue-Eyes White Dragon
  go from 66 individual rows to 37 grouped rows; 8 rows list one card (the set has both cards,
  but not at that rarity), which is expected. Columns: Card name, Card rarity, Box name,
  Box year (+ Box set code if ticked). CSV exports the names as a JSON array.
- **Per-card metrics aren't available while grouped:** Card type, Attribute, Card description
  and Card set code are unticked and greyed out. Hovering (or tapping) one shows a small tooltip:
  "Not available in filter group mode". The note under the switch says so too.
- **Toggling the switch clears the current report** (on or off), so a regular report and a
  grouped report never mix. Run again for the new report.

- **Rarity type-ahead.** The Card rarity box now suggests rarities as you type, from the
  rarity names in the YGOPRODeck printings data (40 in the catalog): "g" suggests Gold Rare,
  Ghost Rare, Ghost/Gold Rare, Gold Secret Rare and Premium Gold Rare. Tap a suggestion or use the
  arrow keys and Enter. One or two letters match the start of a word only.

- **Try an example switches the filter toggle to Box set**, since the example filters by the
  box set Quarter Century Stampede.
- **The Card rarity filter follows the Card rarity metric.** It now appears whenever Card rarity
  is ticked in the Metrics panel, in **Card or Box set** mode (before, it showed only in Card
  mode). Unticking the metric hides the filter and clears its values. Example: Box set mode,
  Magician's Force, Card rarity ticked, "is Secret Rare" gives 2 rows.
- **Display version.** The version badge in the app header now shows **v1.3** for
  presentations (briefly v1.4). Internally the release stays **v1.66** (this changelog, commit messages).

### UAT items
- **UAT-1 (corrected): duplicate product names dropped release dates.**
  - *Found:* during user acceptance testing of the expanded scope, the coverage audit showed
    "Yu-Gi-Oh! 5D's Tag Force 5 Promotional Cards" as a product with no release date.
  - *Cause:* the source lists the same product twice with different capitalization, and only
    one entry is dated ("... promotional cards", 2010-10-26). Printings filed under the undated
    spelling had no box year and couldn't count toward the scope.
  - *Fix:* set names are matched case-insensitively, preferring the dated entry.
  - *Verified:* the product now shows its 2010 date, and one card that had been missing was
    recovered (4,435 → 4,436 cards).
- **UAT-2 (corrected): a rarity spelled two ways.**
  - *Found:* while testing rarity type-ahead, "sec" suggested both "Platinum Secret Rare" and
    "PLatinum Secret Rare".
  - *Cause:* a capitalization typo in the source data on some printings.
  - *Fix:* rarity spellings that differ only in capitalization now use the most common spelling
    everywhere: suggestions, reports and CSV.
  - *Verified:* 40 distinct rarities (was 41); a "Platinum Secret Rare" report shows one spelling.
- **Audit in `data/meta.json`:** token counts and products with no release date.

### Known gaps (documented, not fixable from this source)
- **Tokens:** the source lists 106 Tokens, but only 18 have any English printing and only 1
  (Sheep Token) is in the covered era. The 2008 English Token Packs aren't in the source.
- **Undated products** can't be placed in time; today all of them are post-era (2026 promos and
  brand collaborations), so nothing in the era is affected.

## v1.65 — 2026-11-15

**Theme:** a release that rolls up the v1.64 hotfixes and makes the filter set its own base
metrics. Significant changes:

### Added
- **Light / dark mode** (from the v1.64 hotfixes): System / Light / Dark switch in the header,
  default System, royal blue palette. Removable: see CLAUDE.md.
- **Card rarity filter** (from the v1.64 hotfixes): "Card rarity is / is not" with typed,
  case-insensitive values as chips.

### Changed
- **Try an example** (from the v1.64 hotfixes) runs the six-metric MVP report: Card name, Card
  type, Card rarity, Card set code, Box name and Box year, for Quarter Century Stampede.
- **The filter sets its base metric.**
  - Adding a card to the filter ticks **Card name** if it isn't ticked, so the report always has
    something to show for that card.
  - Adding a box set ticks **Box name** the same way.
  - Switching the toggle from **Card to Box set** clears the card side of the filter: card chips
    are removed, the Card rarity filter is reset and **Card name** is unticked. Box set chips
    stay. Other ticked metrics are left alone.
  - As always, the report only changes on Run; these changes show the rerun warning.

### Hotfix (still v1.65)
- **Switching the toggle starts fresh, both ways.** Going from Card to Box set, or from Box set
  to Card, clears the filter (chips and the Card rarity filter), unticks every metric and clears
  the report. Adding the first card then ticks Card name; adding the first box set ticks Box name.
  (Replaces the narrower v1.65 rule that only removed the card side when switching to Box set.)
  Clicking the toggle that's already selected changes nothing.

- **One notification instead of two.** The yellow warning above the filter now reads "Changes to
  the report have been conducted. Please rerun the reporting again." The second note inside the
  report panel (about "--" columns) is removed; new columns still show "--" until the re-run.

- **Box sets with all of these cards (Could have, built).** With 2+ cards in the filter, a
  pill switch "Only box sets with all of these cards" returns only box sets containing every
  selected card. Example: Dark Magician + Blue-Eyes White Dragon + Red-Eyes Black Dragon = 17 box
  sets, including Legend of Blue Eyes White Dragon and both Quarter Century sets. Turning it on
  locks Card name, Card rarity, Box name and Box year (ticked, can't be unticked, "Locked" tag) and
  shows a note saying so; columns run Card name, Card rarity, then Box name, Box year. It turns off
  with fewer than 2 cards, Clear all, Try an example or switching to Box set.
- **"No results found."** is now the message for any report that comes back empty.
- PRD: new Could have for partial matches (sets with some of the selected cards).

### Also in v1.64 hotfixes (rolled into this release)
- Select all / Clear all for metrics; the "Filter:" line removed from the report header;
  the 50-row screen limit documented as a deliberate design limitation.

## v1.64 — 2026-11-15

**Theme:** tidy the report screen and bring back a guided example.

### Added
- **Try an example (moved from Could have to built).** Next to Run report. It ticks Card name,
  Card rarity, Card set code, Box name and Box year, filters to the box set Quarter Century
  Stampede (RA04) and runs the report. (44 rows: the early-era cards reprinted in that set.)

### Changed
- **Row count only.** The report header shows the total number of rows, which is exactly what
  the CSV export contains (e.g. "461 rows"). The printings count, metrics count and timer are gone.
- **Clear all empties the report.** It clears the filter and removes the report, its row count
  and the "Showing the first 50…" note, so nothing on screen refers to data that isn't shown.
- **"Year" is now "Box year"** in the Metrics sidebar, the table header and the CSV.
- **Simpler filter label.** "Filter (optional)" is now "Filter", and the hint line under it is
  gone. A message appears only when the 20-item limit is reached.

### Hotfix (still v1.64)
- **Try an example now runs the MVP report:** Card name, Card type, Card rarity, Card set code,
  Box name and Box year, filtered to Quarter Century Stampede. Adding Card type shows the example
  covers Spells and Traps too (44 rows: 24 Monsters, 12 Spells, 8 Traps).
- **Removed the "Filter:" line from the report header.** The filter is already visible above the
  report, so the header shows only the row count.
- PRD: the six-metric MVP report is now written into the Must haves.
- **Select all and Clear all for metrics.** At the top of the Metrics sidebar (all metrics) and on
  each group (Card, Box set). "Select all" shows whenever something is unticked, "Clear all"
  whenever something is ticked, so with 4 of 9 ticked you get both.
- **Royal blue instead of purple.** Buttons, checkboxes, focus rings and highlights now use royal
  blue (#4169E1). Checkboxes are drawn by the app so they stay blue in every browser and mode.
  Notifications stay yellow.
- **Card rarity filter (Should have, built).** Under the Filter, with the Card toggle selected:
  "Card rarity **is** / **is not**", then type a rarity and press Enter to add it as a chip.
  Not case-sensitive ("ULTRA rare" → Ultra Rare); a unique start also works ("secret" → Secret
  Rare); text that fits several rarities ("ultra") lists them; unknown text gets a yellow hint.
  Example: Red-Eyes Black Dragon with "is Common, Ultra Rare" gives 21 rows (8 + 13); "is not"
  gives the other 19. Applies to whole-catalog reports and box set filters too. Changes trigger
  the rerun warning; the filter stays applied when the Box set toggle is selected (shown as a
  note); Clear all and Try an example reset it.
- **Light / dark mode (trial).** A System / Light / Dark switch in the header, next to the version,
  defaulting to System (follows the device). In dark mode, blue text such as the row count and
  the Select all / Clear all links turns white; buttons and checkboxes stay blue. Not saved between
  visits. Built to be removable: delete `theme.css`, `theme.js`, their two lines in `index.html`
  and the `#theme-slot` element, and the app stays in light mode.

### Notes
- Version numbers skip 1.63 at the product owner's request.
- Docs: the 50-row screen limit is now recorded as a deliberate design limitation in CLAUDE.md,
  the README and the PRD. It applies to every on-screen report, including Try an example; CSV
  export is the only way to get every row. No app change.

## v1.62 — 2026-11-15

**Theme:** reports change only when they're run.

### Changed
- **No automatic updates after a report runs.** Adding or removing a card or box set in the
  filter, or ticking a new metric, no longer changes the data on screen. A warning appears above
  the filter, "Changes to the report have been selected. Please rerun the report for new
  reporting.", and the Run button is highlighted. Undoing the change hides the warning again.
  (Unticking a metric still hides its column; new metrics still show "--" until the re-run.)
- **The search is now an optional Filter (Must have).** Leave it empty to report on the whole
  catalog: Box set metrics alone list all 461 box sets; Card metrics alone list all 1,398 cards;
  both together list all 9,163 printings. Add cards or box sets to narrow it down. Run only needs
  at least one metric.
- The report header shows which filter the data was run with ("Filter: none (whole catalog)").
- "Clear all" clears the filter only; the last report stays until the next run.

### Why
Make reporting feel like a real system, where new data comes from running a query, and let staff
report on the whole catalog without typing a search first.

## v1.61 — 2026-11-15

**Theme:** make the baseline report behave like a real reporting tool.

### Changed
- **New metrics need a re-run.** If you tick a metric after a report has run, its column appears
  with "--" in every cell, and a note asks you to run the report again. The Run button is
  highlighted until you do. Unticking a metric still removes its column straight away. Changing
  the search refreshes rows only for the metrics that were already run.
- **Nothing is saved between visits.** A page refresh starts blank: no metrics ticked, no search
  and no report. (v1.5 remembered the ticked metrics in the browser; that's removed.) The Run
  button stays disabled until at least one metric is ticked.

### Removed
- **Try an example**, to keep the focus on the baseline report. Moved to the PRD as a Could have.

## v1.6 — 2026-11-15

**Theme:** make the report table something you can work with.

### Added
- **Sortable columns (Must have).** Every column header has a sort icon (↕). Tap once for
  ascending (▲), again for descending (▼). Years and set codes sort naturally (MFC-2 before
  MFC-10); box names starting with numbers come first in A–Z. Blank values (like "—" for a
  Spell's Attribute) always go last. CSV export follows the same sort order.
- **50-row screen limit (Must have).** The on-screen table shows up to 50 rows, with a note:
  "Showing the first 50 of N rows. To get the full report, export it as a CSV." The CSV always
  has every row.

### Changed
- **The report stays in sync (Must have).** Once a report is showing, unticking a metric removes
  its column right away and ticking one adds it. Adding or removing a card or box set from the
  search updates the report too. If the sorted column is removed, the sort resets.

### Why
Staff need to scan by year, rarity or set without exporting, and a short on-screen preview keeps
the table fast and readable on a counter tablet; the CSV is the full record.

## v1.5 — 2026-11-15

**Theme:** turn the app into a real reporting tool: pick your metrics, get one table.

### Added
- **Metrics sidebar (Must have).** A left-hand panel lists the metrics in two groups:
  - **Card:** Card name, Card type (Monster / Spell / Trap), Attribute, Card description,
    Card rarity, Card set code (the printing, e.g. MFC-000)
  - **Box set:** Box name, Box set code (e.g. MFC), Year
  The metrics you tick become the report's columns, in sidebar order. Changing them after a
  report runs updates the table instantly. Your choice is remembered in the browser.
- **Attribute.** YGOPRODeck provides it for every monster (DARK, LIGHT, EARTH, WATER, FIRE,
  WIND); Spells and Traps show "—". Because the API provides it, it's a Must have, not a Won't.
- **Related data model (Must have).** `data/catalog.json` now holds three linked tables, like a
  small database: **cards** (one row per card), **box sets** (one row per set) and
  **printings** (one row per card printed in a set, linking the two with that printing's set
  code and rarity). Searching Dark Magician Girl follows her printings to every box set she's
  in; searching Magician's Force follows its printings to every card in it.

### Changed
- **One report table.** Card and box set searches feed the same table instead of separate
  sections. Each row is a printing reduced to the chosen metrics; identical rows are merged.
  Example: Dark Magician Girl with name, type, description and rarity gives 13 rows (one per
  rarity); add Card set code and it gives all 43 printings.
- **CSV export** matches the on-screen columns exactly.
- Tables show up to 1,000 rows on screen; CSV always has every row. (Lowered to 50 in v1.6.)

### Removed
- **Rarity and set filters.** The search stays bare-bones: Card / Box set toggle plus type-ahead.
  Rarity and set are now columns you can add from the sidebar instead.

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
