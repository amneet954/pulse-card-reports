// Builds data/catalog.json from the YGOPRODeck API (v1 data scope).
//
// Scope: every card (monsters including Fusion and Ritual, Spells and Traps) that was
// printed in the first 11 TCG booster sets
// (Legend of Blue Eyes White Dragon -> Ancient Sanctuary, Mar 2002 - Jun 2004)
// or in any side product released up to Ancient Sanctuary's release date
// (starter decks, tins, tournament packs, promos). For each of those
// cards we keep ALL of its printings to date, so 2014 or 2026 reprints show up too.
//
// Language: English-language TCG printings only (North American codes like LOB-001,
// European/Australian English like LOB-E001 / LOB-A001, and EN codes like LOB-EN001).
// OCG and non-English TCG printings (e.g. Portuguese OTS packs) are left out.
//
// Runs in GitHub Actions (Node 20+, which has fetch). Two API requests total.
// Usage: node scripts/build-data.mjs

import { writeFile, mkdir, readFile } from "node:fs/promises";

const API = "https://db.ygoprodeck.com/api/v7";
const BOOSTER_CODES = ["LOB", "MRD", "SRL", "PSV", "LON", "LOD", "PGD", "MFC", "DCR", "IOC", "AST"];
const FIRST_ERA_END = "2005-01-01"; // boosters must be original prints, not later reissues

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

// 1. Find the 11 original booster sets by code.
const boosters = sets.filter((s) =>
  BOOSTER_CODES.includes(String(s.set_code).toUpperCase()) && s.tcg_date && s.tcg_date < FIRST_ERA_END);
const foundCodes = new Set(boosters.map((s) => s.set_code.toUpperCase()));
const missing = BOOSTER_CODES.filter((c) => !foundCodes.has(c));
if (missing.length) throw new Error(`Booster sets not found in cardsets.php: ${missing.join(", ")}`);

// 2. The era runs up to the last of those boosters (Ancient Sanctuary).
const eraEnd = boosters.map((s) => s.tcg_date).sort().at(-1);
const scopeSets = sets.filter((s) => s.tcg_date && s.tcg_date <= eraEnd);
const scopeNames = new Set(scopeSets.map((s) => s.set_name));

// 3. Pull every card once and keep the ones printed in a scope set.
//    Tokens and Skill Cards are left out: no English printings of either exist in this era
//    (English Tokens start in 2008; Skill Cards belong to Speed Duel, from 2018-19).
const all = (await getJSON(`${API}/cardinfo.php`)).data;
const kept = [];
for (const c of all) {
  if (!/Monster|Spell|Trap/i.test(c.type || "") || /Token/i.test(c.type || "")) continue;
  const printings = (c.card_sets || []).filter((p) => isEnglishTCG(p.set_code));
  if (!printings.some((p) => scopeNames.has(p.set_name))) continue;
  kept.push({ c, printings });
}
kept.sort((a, b) => a.c.name.localeCompare(b.c.name));

// 4. Write three related tables, like a small relational database:
//    cards     — one row per card (name, type, attribute, description)
//    sets      — one row per box set (name, set code, release date)
//    printings — one row per card-in-a-set printing; links a card to a set,
//                with that printing's set code (e.g. MFC-000) and rarity.
const cardType = (t) => (/Spell/i.test(t) ? "Spell" : /Trap/i.test(t) ? "Trap" : "Monster");
const outCards = kept.map(({ c }) => ({
  id: c.id,
  name: c.name,
  card_type: cardType(c.type),
  subtype: c.type,
  attribute: c.attribute || null, // monsters only (DARK, LIGHT, ...); null for Spells and Traps
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
    booster: boosters.some((b) => b.set_name === name),
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
    description: "English-language TCG printings of Monsters (including Fusion and Ritual), Spells and Traps printed in the first 11 TCG booster sets (Legend of Blue Eyes White Dragon to Ancient Sanctuary) or in side products released by Ancient Sanctuary's date, with all of their printings to date.",
    boosters: boosters.map((s) => ({ set_name: s.set_name, set_code: s.set_code, date: s.tcg_date }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    era_end: eraEnd,
    side_products: scopeSets.length - boosters.length,
  },
  cards: outCards,
  sets: outSets,
  printings: outPrintings,
};

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
    sets: outSets.length,
    printings: outPrintings.length,
  }, null, 2) + "\n");
  console.log(`Wrote ${outCards.length} cards, ${outSets.length} sets, ${outPrintings.length} printings (era ends ${eraEnd}).`);
}
