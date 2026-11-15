// Pulse Card Reports — version 1 (Must haves only; see CLAUDE.md for scope).
(function () {
  "use strict";

  const API = "https://db.ygoprodeck.com/api/v7";
  const MAX_TERMS = 20;
  const MAX_FUZZY = 25; // cap partial-name matches per term
  const MAX_SETS_PER_TERM = 5;

  // ---------- Data sources ----------

  const cache = new Map();

  // YGOPRODeck answers "no results" with HTTP 400 and an { error } body.
  async function getJSON(url) {
    if (cache.has(url)) return cache.get(url);
    const p = fetch(url).then(async (r) => {
      const body = await r.json().catch(() => null);
      if (r.ok) return body;
      if (body && body.error) return { data: [] };
      throw new Error("HTTP " + r.status);
    });
    cache.set(url, p);
    p.catch(() => cache.delete(url));
    return p;
  }

  async function safeData(url) {
    try {
      const body = await getJSON(url);
      return (body && body.data) || [];
    } catch (e) {
      return []; // a failed single lookup counts as "no match"; reachability is checked separately
    }
  }

  const liveSource = {
    name: "live",
    sets: () => getJSON(API + "/cardsets.php"),
    exactCard: (name) => safeData(API + "/cardinfo.php?name=" + encodeURIComponent(name)),
    fuzzyCard: (name) => safeData(API + "/cardinfo.php?fname=" + encodeURIComponent(name)),
    cardsInSet: (setName) => safeData(API + "/cardinfo.php?cardset=" + encodeURIComponent(setName)),
  };

  function makeSampleSource(sample) {
    const lc = (s) => s.toLowerCase();
    return {
      name: "sample",
      sets: async () => sample.sets,
      exactCard: async (name) => sample.cards.filter((c) => lc(c.name) === lc(name)),
      fuzzyCard: async (name) => sample.cards.filter((c) => lc(c.name).includes(lc(name))),
      cardsInSet: async (setName) =>
        sample.cards.filter((c) => c.card_sets.some((s) => s.set_name === setName)),
    };
  }

  // ---------- Parsing ----------

  // One term per line; a single line with commas is split on commas.
  function parseTerms(text) {
    const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const terms = lines.length === 1 && lines[0].includes(",")
      ? lines[0].split(",").map((s) => s.trim()).filter(Boolean)
      : lines;
    const seen = new Set();
    return terms.filter((t) => {
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, MAX_TERMS);
  }

  // ---------- Reports ----------

  // Search by card: one row per card, with every box set it was printed in.
  async function cardReport(terms, source) {
    const rows = await Promise.all(terms.map(async (term) => {
      let cards = await source.exactCard(term);
      let partial = false;
      if (!cards.length) {
        cards = (await source.fuzzyCard(term)).slice(0, MAX_FUZZY);
        partial = cards.length > 0;
      }
      if (!cards.length) return [{ term, missing: true }];
      return cards.map((c) => ({
        term,
        partial,
        name: c.name,
        desc: c.desc || "",
        printings: (c.card_sets || []).map((s) => ({
          set_name: s.set_name, set_code: s.set_code, rarity: s.set_rarity,
        })),
      }));
    }));
    return rows.flat();
  }

  // Match a term to sets: exact set code prefix ("MFC"), full printing code ("MFC-000"),
  // exact set name, then partial set name.
  function matchSets(term, sets) {
    const t = term.trim().toLowerCase();
    const prefix = t.split("-")[0];
    const byCode = sets.filter((s) => (s.set_code || "").toLowerCase() === prefix);
    if (byCode.length) return byCode.slice(0, MAX_SETS_PER_TERM);
    const exact = sets.filter((s) => s.set_name.toLowerCase() === t);
    if (exact.length) return exact.slice(0, 1);
    return sets.filter((s) => s.set_name.toLowerCase().includes(t)).slice(0, MAX_SETS_PER_TERM);
  }

  // Search by box set: one row per box, with every card in it.
  async function setReport(terms, source) {
    const allSets = await source.sets();
    const rows = await Promise.all(terms.map(async (term) => {
      const sets = matchSets(term, allSets);
      if (!sets.length) return [{ term, missing: true }];
      return Promise.all(sets.map(async (set) => {
        const cards = await source.cardsInSet(set.set_name);
        const prefix = (set.set_code || "").toUpperCase();
        const items = [];
        for (const c of cards) {
          for (const s of c.card_sets || []) {
            if (s.set_name !== set.set_name) continue;
            if (prefix && !(s.set_code || "").toUpperCase().startsWith(prefix)) continue;
            items.push({ name: c.name, desc: c.desc || "", set_code: s.set_code, rarity: s.set_rarity });
          }
        }
        items.sort((a, b) => a.set_code.localeCompare(b.set_code, undefined, { numeric: true }) || a.name.localeCompare(b.name));
        return { term, name: set.set_name, set_code: set.set_code, tcg_date: set.tcg_date, items };
      }));
    }));
    return rows.flat();
  }

  // Card-mode filters: rarity (exact) and set name/code (contains).
  function applyCardFilters(rows, rarity, setText) {
    const st = (setText || "").trim().toLowerCase();
    if (!rarity && !st) return rows;
    return rows.map((r) => {
      if (r.missing) return r;
      const printings = r.printings.filter((p) =>
        (!rarity || p.rarity === rarity) &&
        (!st || p.set_name.toLowerCase().includes(st) || p.set_code.toLowerCase().includes(st)));
      return Object.assign({}, r, { printings, filteredOut: printings.length === 0 });
    });
  }

  // ---------- CSV ----------

  function csvCell(v) {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(mode, rows) {
    const out = [];
    if (mode === "card") {
      out.push(["search_term", "card_name", "box_set", "set_code", "rarity"]);
      for (const r of rows) {
        if (r.missing) { out.push([r.term, "NO MATCH", "", "", ""]); continue; }
        for (const p of r.printings) out.push([r.term, r.name, p.set_name, p.set_code, p.rarity]);
      }
    } else {
      out.push(["search_term", "box_set", "set_code", "card_name", "rarity", "description"]);
      for (const r of rows) {
        if (r.missing) { out.push([r.term, "NO MATCH", "", "", "", ""]); continue; }
        for (const it of r.items) out.push([r.term, r.name, it.set_code, it.name, it.rarity, it.desc]);
      }
    }
    return out.map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  const core = { parseTerms, cardReport, setReport, matchSets, applyCardFilters, toCSV, makeSampleSource };
  if (typeof module !== "undefined" && module.exports) { module.exports = core; return; }

  // ---------- UI ----------

  const $ = (id) => document.getElementById(id);
  const state = { mode: "card", rows: [], source: null, ms: 0, terms: [] };

  const COPY = {
    card: {
      label: "Card names, one per line",
      placeholder: "Dark Magician\nBlue-Eyes White Dragon",
      example: "Dark Magician\nDark Magician Girl\nBlue-Eyes White Dragon",
      title: "Card report",
    },
    set: {
      label: "Box set names or set codes, one per line",
      placeholder: "Magician's Force\nSDK",
      example: "Magician's Force\nSDK\nLegend of Blue Eyes White Dragon",
      title: "Box set report",
    },
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll(".mode").forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    $("terms-label").textContent = COPY[mode].label;
    $("terms").placeholder = COPY[mode].placeholder;
    $("card-filters").hidden = mode !== "card";
    $("results-panel").hidden = true;
    state.rows = [];
  }

  // Check once whether the live API is reachable; otherwise fall back to sample data.
  async function pickSource() {
    if (state.source) return state.source;
    try {
      const sets = await liveSource.sets();
      if (!Array.isArray(sets) || !sets.length) throw new Error("empty");
      state.source = liveSource;
    } catch (e) {
      state.source = makeSampleSource(window.PULSE_SAMPLE);
      const b = $("banner");
      b.textContent = "Live card data is unreachable, so this report uses a small built-in sample. " +
        "Sample results cover only a few cards and are not complete.";
      b.hidden = false;
    }
    return state.source;
  }

  function filteredRows() {
    if (state.mode !== "card") return state.rows;
    return applyCardFilters(state.rows, $("rarity").value, $("setfilter").value);
  }

  function refreshRarityOptions() {
    const sel = $("rarity");
    const keep = sel.value;
    const rarities = new Set();
    state.rows.forEach((r) => (r.printings || []).forEach((p) => p.rarity && rarities.add(p.rarity)));
    sel.innerHTML = '<option value="">All rarities</option>' +
      [...rarities].sort().map((r) => `<option${r === keep ? " selected" : ""}>${esc(r)}</option>`).join("");
  }

  function render() {
    const rows = filteredRows();
    const isCard = state.mode === "card";
    $("results-title").textContent = COPY[state.mode].title;
    const found = rows.filter((r) => !r.missing).length;
    const secs = (state.ms / 1000).toFixed(2);
    $("results-meta").innerHTML =
      `${state.terms.length} search${state.terms.length === 1 ? "" : "es"} · ${found} result${found === 1 ? "" : "s"} · ` +
      `ready in <strong>${secs} s</strong>`;

    $("report-head").innerHTML = isCard
      ? "<tr><th>Card name</th><th>Box sets (set code · rarity)</th></tr>"
      : "<tr><th>Box set</th><th>Cards (set code · card · rarity)</th></tr>";

    $("report-body").innerHTML = rows.map((r) => {
      if (r.missing) {
        return `<tr><td class="name">${esc(r.term)}</td><td class="miss">No match found. Check the spelling or try a shorter name.</td></tr>`;
      }
      if (isCard) {
        const tag = r.partial ? `<span class="tag">Partial match for “${esc(r.term)}”</span>` : "";
        const desc = r.desc ? `<details><summary>Description</summary><p>${esc(r.desc)}</p></details>` : "";
        const list = r.filteredOut
          ? `<span class="miss">No printings match the filters.</span>`
          : `<ul class="items">${r.printings.map((p) =>
              `<li><span class="code">${esc(p.set_code)}</span><span>${esc(p.set_name)}</span><span class="rarity">${esc(p.rarity)}</span></li>`).join("")}</ul>`;
        return `<tr><td class="name">${esc(r.name)}${tag}${desc}</td><td>${list}</td></tr>`;
      }
      const sub = [r.set_code, r.tcg_date, `${r.items.length} printing${r.items.length === 1 ? "" : "s"}`].filter(Boolean).map(esc).join(" · ");
      const list = r.items.length
        ? `<ul class="items">${r.items.map((it) =>
            `<li><span class="code">${esc(it.set_code)}</span><span>${esc(it.name)}</span><span class="rarity">${esc(it.rarity)}</span>` +
            (it.desc ? `<details><summary>Description</summary><p>${esc(it.desc)}</p></details>` : "") + `</li>`).join("")}</ul>`
        : `<span class="miss">No cards found for this set.</span>`;
      return `<tr><td class="name">${esc(r.name)}<span class="sub">${sub}</span></td><td>${list}</td></tr>`;
    }).join("");

    $("results-panel").hidden = false;
  }

  async function run(e) {
    if (e) e.preventDefault();
    const terms = parseTerms($("terms").value);
    if (!terms.length) { $("terms").focus(); return; }
    const btn = $("run");
    btn.disabled = true;
    btn.textContent = "Running…";
    const t0 = performance.now();
    try {
      const source = await pickSource();
      state.rows = state.mode === "card" ? await cardReport(terms, source) : await setReport(terms, source);
      state.terms = terms;
      state.ms = performance.now() - t0;
      if (state.mode === "card") refreshRarityOptions();
      render();
    } finally {
      btn.disabled = false;
      btn.textContent = "Run report";
    }
  }

  function csvName() {
    const d = new Date().toISOString().slice(0, 10);
    return `pulse-${state.mode === "card" ? "card" : "box-set"}-report-${d}.csv`;
  }

  function downloadCSV() {
    const blob = new Blob([toCSV(state.mode, filteredRows())], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = csvName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copyCSV() {
    const btn = $("copy-csv");
    try {
      await navigator.clipboard.writeText(toCSV(state.mode, filteredRows()));
      btn.textContent = "Copied";
    } catch (err) {
      btn.textContent = "Copy failed";
    }
    setTimeout(() => (btn.textContent = "Copy CSV"), 1500);
  }

  document.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  $("search-form").addEventListener("submit", run);
  $("example").addEventListener("click", () => { $("terms").value = COPY[state.mode].example; run(); });
  $("rarity").addEventListener("change", () => state.rows.length && render());
  $("setfilter").addEventListener("input", () => state.rows.length && render());
  $("download-csv").addEventListener("click", downloadCSV);
  $("copy-csv").addEventListener("click", copyCSV);
  $("terms").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(e);
  });
})();
