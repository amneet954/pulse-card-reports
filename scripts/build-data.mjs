// Builds data/cards.json from the YGOPRODeck API (v1 data scope).
//
// Scope: every MONSTER card that was printed in the first 11 TCG booster sets
// (Legend of Blue Eyes White Dragon -> Ancient Sanctuary, Mar 2002 - Jun 2004)
// or in any side product released up to Ancient Sanctuary's release date
// (starter decks, tins, tournament packs, promos). For each of those monsters
// we keep ALL of its printings to date, so 2014 or 2026 reprints show up too.
//
// Runs in GitHub Actions (Node 20+, which has fetch). Two API requests total.
// Usage: node scripts/build-data.mjs

import { writeFile, mkdir, readFile } from "node:fs/promises";

const API = "https://db.ygoprodeck.com/api/v7";
const BOOSTER_CODES = ["LOB", "MRD", "SRL", "PSV", "LON", "LOD", "PGD", "MFC", "DCR", "IOC", "AST"];
const FIRST_ERA_END = "2005-01-01"; // boosters must be original prints, not later reissues

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

// 3. Pull every card once and keep the monsters printed in a scope set.
const all = (await getJSON(`${API}/cardinfo.php`)).data;
const cards = [];
for (const c of all) {
  if (!/Monster/i.test(c.type || "")) continue;
  const printings = c.card_sets || [];
  if (!printings.some((p) => scopeNames.has(p.set_name))) continue;
  cards.push({
    id: c.id,
    name: c.name,
    type: c.type,
    desc: c.desc,
    printings: printings
      .map((p) => ({
        set_name: p.set_name,
        set_code: p.set_code,
        rarity: p.set_rarity,
        date: setByName.get(p.set_name)?.tcg_date || null,
      }))
      .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || a.set_code.localeCompare(b.set_code)),
  });
}
cards.sort((a, b) => a.name.localeCompare(b.name));

// 4. Every set any of these monsters appears in (for box set search).
const usedSetNames = new Set(cards.flatMap((c) => c.printings.map((p) => p.set_name)));
const outSets = sets
  .filter((s) => usedSetNames.has(s.set_name))
  .map((s) => ({
    set_name: s.set_name,
    set_code: s.set_code,
    date: s.tcg_date || null,
    in_scope: scopeNames.has(s.set_name),
    booster: boosters.some((b) => b.set_name === s.set_name),
  }))
  .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || a.set_name.localeCompare(b.set_name));

const data = {
  scope: {
    description: "Monsters first printed in the first 11 TCG booster sets (Legend of Blue Eyes White Dragon to Ancient Sanctuary) or in side products released by Ancient Sanctuary's date, with all of their printings to date.",
    boosters: boosters.map((s) => ({ set_name: s.set_name, set_code: s.set_code, date: s.tcg_date }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    era_end: eraEnd,
    side_products: scopeSets.length - boosters.length,
  },
  sets: outSets,
  cards,
};

await mkdir("data", { recursive: true });
const body = JSON.stringify(data);
let previous = "";
try { previous = await readFile("data/cards.json", "utf8"); } catch {}
if (previous === body) {
  console.log("No change in card data.");
} else {
  await writeFile("data/cards.json", body);
  await writeFile("data/meta.json", JSON.stringify({
    generated_at: new Date().toISOString(),
    source: "YGOPRODeck API v7",
    monsters: cards.length,
    sets: outSets.length,
    printings: cards.reduce((n, c) => n + c.printings.length, 0),
  }, null, 2) + "\n");
  console.log(`Wrote ${cards.length} monsters across ${outSets.length} sets (era ends ${eraEnd}).`);
}
