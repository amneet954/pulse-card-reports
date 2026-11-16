// Builds data/catalog.json from the YGOPRODeck API (v1 data scope).
//
// Scope: every English TCG card (Monsters including Fusion, Ritual and Synchro, Spells, Traps and
// Tokens) printed in any product released on or before Extreme Victory (EXVC, early 2011):
// core booster sets, side sets, starter / structure decks, tins, tournament packs and promos.
// Extreme Victory is the last set before Xyz monsters arrived in the TCG. For each of those
// cards we keep ALL of its English printings to date, so later reprints show up too.
//
// Language: English-language TCG printings only (North American codes like LOB-001,
// European/Australian English like LOB-E001 / LOB-A001, and EN codes like LOB-EN001).
// OCG and non-English TCG printings (e.g. Portuguese OTS packs) are left out.
// Skill Cards (Speed Duel, 2018+) are left out.
//
// Runs in GitHub Actions (Node 20+, which has fetch). Two API requests total.
// Usage: node scripts/build-data.mjs

import { writeFile, mkdir, readFile } from "node:fs/promises";

const API = "https://db.ygoprodeck.com/api/v7";
const ERA_END_SET_CODE = "EXVC"; // Extreme Victory: the last product covered

// Region letters after the hyphen in a set code: "" (NA), "E"/"A" (EU/AU English), "EN..." (English).
function isEnglishTCG(setCode) {
  const m = /^[^-]+-([A-Z]*)/.exec(String(setCode || "").toUpperCase());
  if (!m) return true;
  return m[1] === "" || m[1] === "E" || m[1] === "A" || m[1].startsWith("EN");
}

async function getJSON(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "pulse-card-reports data build" } });
    if (res.ok) return res.json();
    console.warn(`Attempt ${attempt} failed for ${url}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  throw new Error(`Could not fetch ${url}`);
}

const sets = await getJSON(`${API}/cardsets.php`);
const setByName = new Map(sets.map((s) => [s.set_name, s]));

// 1. The era runs up to Extreme Victory's TCG release date.
const eraSet = sets.find((s) => String(s.set_code).toUpperCase() === ERA_END_SET_CODE && s.tcg_date);
if (!eraSet) throw new Error(`Era end set ${ERA_END_SET_CODE} not found in cardsets.php`);
const eraEnd = eraSet.tcg_date;
const scopeSets = sets.filter((s) => s.tcg_date && s.tcg_date <= eraEnd);
const scopeNames = new Set(scopeSets.map((s) => s.set_name));

// 2. Pull every card once and keep the ones with an English printing in a scope set.
const all = (await getJSON(`${API}/cardinfo.php`)).data;
const kept = [];
for (const c of all) {
  if (!/Monster|Spell|Trap|Token/i.test(c.type || "") || /Skill/i.test(c.type || "")) continue;
  const printings = (c.card_sets || []).filter((p) => isEnglishTCG(p.set_code));
  if (!printings.some((p) => scopeNames.has(p.set_name))) continue;
  kept.push({ c, printings });
}
kept.sort((a, b) => a.c.name.localeCompare(b.c.name));

// 3. Write three related tables, like a small relational database:
//    cards     — one row per card (name, type, attribute, description)
//    sets      — one row per box set (name, set code, release date)
//    printings — one row per card-in-a-set printing; links a card to a set,
//                with that printing's set code (e.g. MFC-000) and rarity.
const cardType = (t) => (/Token/i.test(t) ? "Token" : /Spell/i.test(t) ? "Spell" : /Trap/i.test(t) ? "Trap" : "Monster");
const outCards = kept.map(({ c }) => ({
  id: c.id,
  name: c.name,
  card_type: cardType(c.type),
  subtype: c.type,
  attribute: c.attribute || null, // monsters and some Tokens (DARK, LIGHT, ...); null for Spells and Traps
  desc: c.desc,
}));

const setIdByName = new Map();
const outSets = [];
function setIdFor(name, printingCode) {
  if (setIdByName.has(name)) return setIdByName.get(name);
  const s = setByName.get(name);
  const id = outSets.length;
  outSets.push({
    id,
    set_name: name,
    set_code: s?.set_code || String(printingCode || "").split("-")[0] || null,
    date: s?.tcg_date || null,
    in_scope: scopeNames.has(name),
  });
  setIdByName.set(name, id);
  return id;
}

const outPrintings = [];
for (const { c, printings } of kept) {
  for (const p of printings) {
    outPrintings.push({ card_id: c.id, set_id: setIdFor(p.set_name, p.set_code), code: p.set_code, rarity: p.set_rarity });
  }
}

const data = {
  schema_version: 2,
  scope: {
    description: "English-language TCG printings of every Monster (including Fusion, Ritual and Synchro), Spell, Trap and Token card printed in any product released on or before Extreme Victory, with all of their English printings to date.",
    era_end_set: { set_name: eraSet.set_name, set_code: eraSet.set_code, date: eraSet.tcg_date },
    era_end: eraEnd,
    products_in_era: scopeSets.length,
  },
  cards: outCards,
  sets: outSets,
  printings: outPrintings,
};

// 4. Coverage audit: English printings in products the API gives no release date. Those
//    products can't be placed before or after the cutoff, so they never qualify a card.
const tokensInApi = all.filter((c) => /Token/i.test(c.type || ""));
const tokenAudit = {
  in_api: tokensInApi.length,
  with_any_english_printing: tokensInApi.filter((c) => (c.card_sets || []).some((p) => isEnglishTCG(p.set_code))).length,
};
const undated = new Map();
for (const c of all) {
  for (const p of (c.card_sets || []).filter((x) => isEnglishTCG(x.set_code))) {
    if (!setByName.get(p.set_name)?.tcg_date) undated.set(p.set_name, (undated.get(p.set_name) || 0) + 1);
  }
}

await mkdir("data", { recursive: true });
const body = JSON.stringify(data);
let previous = "";
try { previous = await readFile("data/catalog.json", "utf8"); } catch {}
if (previous === body) {
  console.log("No change in card data.");
} else {
  await writeFile("data/catalog.json", body);
  await writeFile("data/meta.json", JSON.stringify({
    generated_at: new Date().toISOString(),
    source: "YGOPRODeck API v7",
    schema_version: 2,
    cards: outCards.length,
    monsters: outCards.filter((c) => c.card_type === "Monster").length,
    spells: outCards.filter((c) => c.card_type === "Spell").length,
    traps: outCards.filter((c) => c.card_type === "Trap").length,
    tokens: outCards.filter((c) => c.card_type === "Token").length,
    token_audit: tokenAudit,
    era_end: `${eraSet.set_name} (${eraSet.set_code}), ${eraEnd}`,
    products_in_era: scopeSets.length,
    undated_products: [...undated].sort((a, b) => b[1] - a[1]).map(([name, printings]) => ({ name, printings })),
    sets: outSets.length,
    printings: outPrintings.length,
  }, null, 2) + "\n");
  console.log(`Wrote ${outCards.length} cards, ${outSets.length} sets, ${outPrintings.length} printings (era ends ${eraEnd}).`);
}
