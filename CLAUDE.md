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

- `cards`: `{ id, name, card_type (Monster|Spell|Trap|Token), subtype, attribute (null for Spell/Trap), desc }`
- `sets`: `{ id, set_name, set_code (e.g. MFC), date, in_scope }`
- `printings`: `{ card_id, set_id, code (e.g. MFC-000), rarity }` — joins a card to a box set

**v1 data scope (since v1.66):** every English TCG Monster (including Fusion, Ritual and Synchro),
Spell, Trap and **Token** card printed in any product released on or before **Extreme Victory (EXVC,
TCG release 2011-05-06)**: core booster sets, side sets, starter / structure decks, tins, tournament
packs and promos. Each card keeps all of its English printings to date. EXVC is the last set before
Xyz monsters; Generation Force and the 2011 tins come after it and are out. **English-language TCG
printings only** (codes like LOB-001, LOB-E001, LOB-A005, LOB-EN001); OCG and non-English printings
are excluded. Skill Cards (Speed Duel) are excluded. Set names are matched case-insensitively
because the API sometimes lists one product under two capitalizations.

**Known data gaps (from the coverage audit in `data/meta.json`):**
- **Tokens:** YGOPRODeck lists 106 Tokens but only 18 have any English printing, and only 1
  (Sheep Token) falls inside the scope. The English Token Packs of 2008 aren't in the source.
- **Undated products:** printings in products the API gives no release date can't be placed
  before or after the cutoff. Today these are all post-era (2026 promos, brand collaborations).

Rules:
- Do **not** use the `tcgplayer_data` parameter: YGOPRODeck says it cannot guarantee set names and
  rarities with it.
- Do **not** hotlink card images. Images are out of scope anyway.
- Keep the build to a couple of API requests; be polite to the free API.

## Must have (version 1)

1. **Data coverage:** the v1 data scope above: Monster (Fusion, Ritual, Synchro), Spell, Trap and
   Token cards from every English TCG product through Extreme Victory, every printing to date.
2. **English-language TCG products only**, from the start of the TCG through Extreme Victory
   (May 2011): core sets, side sets, decks, tins and promos.
3. **Related data model:** cards and box sets are separate tables joined by printings, so a card
   search finds every box set it's in and a box set search finds every card in it.
4. **Metrics sidebar** with two groups; ticked metrics become the report's columns:
   - **Card:** Card name, Card type (Monster/Spell/Trap/Token), Attribute, Card description, Card rarity,
     Card set code (the printing, e.g. MFC-000)
   - **Box set:** Box name, Box set code (e.g. MFC), Box year
   - **MVP report:** the core report Pulse is built around uses six metrics: Card name, Card type,
     Card rarity, Card set code, Box name and Box year. Try an example runs exactly this report.
5. **Filter (optional)**: one box with a **Card / Box set toggle** and **type-ahead suggestions** that
   ignore punctuation and spacing ("red eyes" finds "Red-Eyes Black Dragon"). Leaving it empty runs
   the report on the whole catalog (e.g. Box set metrics alone list every box set).
   - **Switching the toggle starts fresh:** going from Card to Box set, or Box set to Card,
     clears the filter (chips and Card rarity), unticks every metric and clears the report.
   - **Base metrics:** adding a card to the filter ticks Card name; adding a box set ticks Box
     name.
6. Filter by **several cards or box sets at once** (up to 20; pasting a list works).
7. **One report table:** each row is a printing projected onto the chosen metrics; identical rows
   are merged.
   - **Empty results:** when a report finds nothing, the table says "No results found."
   - **Sortable columns:** a sort icon on every header toggles ascending / descending (natural sort
     for years and set codes; blanks last).
   - **50-row screen limit (deliberate design limitation):** any report shown in the UI, including
     Try an example, displays at most 50 rows, with a note to export the full report as CSV. The
     CSV export is the only way to get every row. Do not raise or remove this limit.
8. Results in **under 2 seconds**, usable on a tablet.
9. **View results on screen and export to CSV** (same columns and sort order as the screen; CSV has every row).

## Should have
- **Card rarity filter** in the Filter section, shown when the Card toggle is selected. It reads
  "Card rarity **is** / **is not**": type a rarity (not case-sensitive), press Enter, and it becomes
  a chip; add as many as needed (e.g. Common, Ultra Rare). "Is" keeps only those rarities; "is not"
  excludes them. Why: one card can have many rarities, and many printings within each rarity
  (Red-Eyes Black Dragon has 8 Common and 13 Ultra Rare printings), so narrowing by rarity is often
  the fastest way to the printing a customer asked for. **Built in v1.64 (hotfix), released in v1.65.** Typed text
  matches a catalog rarity exactly (any case) or by a unique prefix ("secret" → Secret Rare);
  ambiguous text lists the options. **Type-ahead (v1.66 hotfix):** suggestions come from the
  catalog's rarity names (YGOPRODeck printings data), e.g. "g" → Gold Rare, Ghost Rare, Gold Secret
  Rare; rarity spellings that differ only in case are merged (UAT-2). The filter applies on Run (part of the rerun warning), stays
  applied when the Box set toggle is selected (shown as a note), and Clear all resets it.
- Full, up-to-date catalog: every set and every card, including cards first released after
  Extreme Victory (the Xyz era onward, e.g. 2022 or 2026). Decide whether to include Skill Cards
  (Speed Duel). Tokens are already in scope.

## Could have
- OCG products and non-English printings (Japanese, Asian-English, French, German, Italian, Spanish, Portuguese)
- Card and box prices (current market value from `set_price` / `card_prices`)
- Search-demand analytics (how often a card, set and rarity were requested)
- **Box sets with all of these cards** (built in v1.65 hotfix): in Card mode with 2+ cards, a
  pill-style on/off switch, "Only box sets with all of these cards". It returns only box sets
  that contain every selected card (Monsters, Spells and Traps), listing those cards' printings
  there. Turning it on shows "This filter locks the following metrics to be run on the report:
  Card name, Card rarity, Box name, Box year." Those four are ticked and can't be unticked while
  it's on; other metrics can be added. Column order: Card name, Card rarity, other card metrics,
  Box name, Box year, other box metrics. The Card rarity filter still applies to the rows. It
  switches off if fewer than 2 cards remain, on Clear all, on Try an example and when switching to
  Box set. **Grouped rows (v1.66 hotfix):** one row per box set + rarity; Card name is an array of
  strings (alphabetical) with the cards printed there at that rarity; a row may list only some of
  the cards. Columns: Card name, Card rarity, Box name, Box year (+ Box set code if ticked); CSV
  exports the names as a JSON array. **While grouped, per-card fields are not available:** Card
  type, Attribute, Card description and Card set code are unticked and greyed out; hovering or
  tapping one shows the tooltip "Not available in filter group mode".
  Toggling the switch on or off clears the current report.
- Partial matches for the above: box sets that contain some of the selected cards (e.g. 3 of 4),
  showing how many match.
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
  (v1.66) and record changes as hotfixes under it until told to move to the next one.
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
- `theme.css`, `theme.js` — light / dark mode (trial, removable). To remove: delete both files,
  their `<link>` / `<script>` lines in `index.html` and the `#theme-slot` element. All colors live
  in CSS variables at the top of `styles.css` (royal blue `--accent`, `--accent-text` for blue
  text); `theme.css` only overrides those variables for dark mode.
