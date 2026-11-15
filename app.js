// Pulse Card Reports v1.2 — see CLAUDE.md for scope and CHANGELOG.md for history.
(function () {
  "use strict";

  const VERSION = "1.2";
  const MAX_ITEMS = 20;
  const MAX_SUGGESTIONS = 8;

  // ---------- Text matching ----------

  // "Red-Eyes B. Dragon" and "red eyes b dragon" normalize to the same string.
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  // Lower score = better match. null = no match.
  function score(query, target) {
    if (!query) return null;
    if (target === query) return 0;
    if (target.startsWith(query)) return 1;
    if ((" " + target).includes(" " + query)) return 2;
    if (target.includes(query)) return 3;
    const words = query.split(" ");
    if (words.length > 1 && words.every((w) => (" " + target).includes(" " + w))) return 4;
    const cq = query.replace(/ /g, "");
    if (cq.length >= 3 && target.replace(/ /g, "").includes(cq)) return 5; // "redeyes" -> "Red-Eyes"
    return null;
  }

  // ---------- Data index ----------

  function buildIndex(data) {
    const cards = data.cards.map((c) => Object.assign({ key: norm(c.name) }, c));
    const sets = data.sets.map((s) => Object.assign({ key: norm(s.set_name), codeKey: norm(s.set_code) }, s));
    const printingsBySet = new Map();
    for (const c of cards) {
      for (const p of c.printings) {
        if (!printingsBySet.has(p.set_name)) printingsBySet.set(p.set_name, []);
        printingsBySet.get(p.set_name).push({ name: c.name, desc: c.desc, set_code: p.set_code, rarity: p.rarity });
      }
    }
    return { cards, sets, printingsBySet, scope: data.scope || null };
  }

  function suggest(index, kind, text, limit) {
    const q = norm(text);
    if (!q) return [];
    const out = [];
    if (kind === "card") {
      for (const c of index.cards) {
        const s = score(q, c.key);
        if (s !== null) out.push({ s, len: c.name.length, item: { kind: "card", name: c.name, id: c.id, type: c.type } });
      }
    } else {
      for (const set of index.sets) {
        const sc = set.codeKey === q ? 0 : null;
        const sn = score(q, set.key);
        const s = sc !== null ? sc : sn;
        if (s !== null) {
          out.push({ s, len: set.set_name.length, item: {
            kind: "set", name: set.set_name, set_code: set.set_code, date: set.date, in_scope: set.in_scope } });
        }
      }
    }
    out.sort((a, b) => a.s - b.s || a.len - b.len || a.item.name.localeCompare(b.item.name));
    return out.slice(0, limit || MAX_SUGGESTIONS).map((o) => o.item);
  }

  // Best single match for typed or pasted text, or a "missing" item.
  function resolve(index, kind, text) {
    const best = suggest(index, kind, text, 1)[0];
    return best || { kind, name: text.trim(), missing: true };
  }

  function splitList(text) {
    return String(text).split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
  }

  // ---------- Reports ----------

  function cardRows(index, items) {
    return items.map((it) => {
      if (it.missing) return { kind: "card", term: it.name, missing: true };
      const c = index.cards.find((x) => x.name === it.name);
      return { kind: "card", name: c.name, desc: c.desc, type: c.type, printings: c.printings };
    });
  }

  function setRows(index, items) {
    return items.map((it) => {
      if (it.missing) return { kind: "set", term: it.name, missing: true };
      const set = index.sets.find((s) => s.set_name === it.name);
      const list = (index.printingsBySet.get(set.set_name) || []).slice()
        .sort((a, b) => a.set_code.localeCompare(b.set_code, undefined, { numeric: true }) || a.name.localeCompare(b.name));
      return { kind: "set", name: set.set_name, set_code: set.set_code, date: set.date, in_scope: set.in_scope, items: list };
    });
  }

  function applyFilters(rows, rarity, setText) {
    const st = norm(setText);
    if (!rarity && !st) return rows;
    return rows.map((r) => {
      if (r.missing || r.kind !== "card") return r;
      const printings = r.printings.filter((p) =>
        (!rarity || p.rarity === rarity) &&
        (!st || norm(p.set_name).includes(st) || norm(p.set_code).includes(st)));
      return Object.assign({}, r, { printings, total: r.printings.length, filteredOut: printings.length === 0 });
    });
  }

  // ---------- CSV ----------

  function csvCell(v) {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(rows) {
    const out = [["search_type", "search", "card_name", "box_set", "set_code", "rarity", "release_date", "description"]];
    for (const r of rows) {
      const type = r.kind === "card" ? "card" : "box set";
      if (r.missing) { out.push([type, r.term, "NO MATCH", "", "", "", "", ""]); continue; }
      if (r.kind === "card") {
        for (const p of r.printings) out.push([type, r.name, r.name, p.set_name, p.set_code, p.rarity, p.date || "", r.desc]);
      } else {
        for (const it of r.items) out.push([type, r.name, it.name, r.name, it.set_code, it.rarity, r.date || "", it.desc]);
      }
    }
    return out.map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  // Older sample format -> current data format.
  function sampleToData(sample) {
    const dates = {};
    return {
      sets: sample.sets.map((s) => ({ set_name: s.set_name, set_code: s.set_code, date: s.date || null, in_scope: true })),
      cards: sample.cards.map((c) => ({
        name: c.name, desc: c.desc, type: c.type || "Monster",
        printings: c.card_sets.map((p) => ({ set_name: p.set_name, set_code: p.set_code, rarity: p.set_rarity, date: dates[p.set_name] || null })),
      })),
    };
  }

  const core = { norm, score, buildIndex, suggest, resolve, splitList, cardRows, setRows, applyFilters, toCSV, sampleToData };
  if (typeof module !== "undefined" && module.exports) { module.exports = core; return; }

  // ---------- UI ----------

  const $ = (id) => document.getElementById(id);
  const state = { kind: "card", items: [], index: null, rows: [], ms: 0, active: -1, options: [] };

  const PLACEHOLDER = {
    card: "Start typing a card name, e.g. red-eyes",
    set: "Start typing a box set or code, e.g. Magician's Force or MFC",
  };
  const EXAMPLE = [
    { kind: "card", text: "Red-Eyes Black Dragon" },
    { kind: "card", text: "Alpha The Magnet Warrior" },
    { kind: "set", text: "Magician's Force" },
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const year = (d) => (d ? d.slice(0, 4) : "");
  // "Normal Monster" -> "Monster", "Fusion Monster" stays, "Spell Card" -> "Spell".
  const typeLabel = (t) => String(t || "").replace(/^(Normal|Effect) Monster$/, "Monster").replace(/ Card$/, "");
  const fmtTime = (ms) => (ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(2)} s`);

  async function loadIndex() {
    if (state.index) return state.index;
    try {
      const res = await fetch("data/cards.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      state.index = buildIndex(await res.json());
    } catch (e) {
      state.index = buildIndex(sampleToData(window.PULSE_SAMPLE));
      const b = $("banner");
      b.textContent = "The card database couldn't be loaded, so you're seeing a small built-in sample of 3 cards. " +
        "If you opened this file directly, run it from a web server or use the live site.";
      b.hidden = false;
    }
    return state.index;
  }

  // --- toggle ---
  function setKind(kind) {
    state.kind = kind;
    document.querySelectorAll(".seg").forEach((b) => {
      const on = b.dataset.kind === kind;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
    $("q").placeholder = PLACEHOLDER[kind];
    updateSuggestions();
    $("q").focus();
  }

  // --- suggestions ---
  function closeSuggestions() {
    $("suggestions").hidden = true;
    $("q").setAttribute("aria-expanded", "false");
    state.options = [];
    state.active = -1;
  }

  function renderSuggestions() {
    const list = $("suggestions");
    if (!state.options.length) {
      const q = $("q").value.trim();
      if (q.length >= 2) {
        list.innerHTML = `<li class="empty">No ${state.kind === "card" ? "card" : "box set"} matches “${esc(q)}”.</li>`;
        list.hidden = false;
      } else closeSuggestions();
      return;
    }
    list.innerHTML = state.options.map((o, i) => {
      const meta = o.kind === "set"
        ? [o.set_code, year(o.date)].filter(Boolean).map(esc).join(" · ")
        : esc(typeLabel(o.type));
      return `<li role="option" id="opt-${i}" class="${i === state.active ? "active" : ""}" aria-selected="${i === state.active}" data-i="${i}">` +
        `<span>${esc(o.name)}</span><span class="opt-meta">${meta}</span></li>`;
    }).join("");
    list.hidden = false;
    $("q").setAttribute("aria-expanded", "true");
    $("q").setAttribute("aria-activedescendant", state.active >= 0 ? `opt-${state.active}` : "");
  }

  async function updateSuggestions() {
    const text = $("q").value;
    if (norm(text).length < 1) { closeSuggestions(); return; }
    const index = await loadIndex();
    state.options = suggest(index, state.kind, text);
    state.active = state.options.length ? 0 : -1;
    renderSuggestions();
  }

  // --- chips ---
  function addItem(item) {
    const dup = state.items.some((x) => x.kind === item.kind && x.name.toLowerCase() === item.name.toLowerCase());
    if (dup || state.items.length >= MAX_ITEMS) return;
    state.items.push(item);
    renderChips();
  }

  function renderChips() {
    $("chips").innerHTML = state.items.map((it, i) =>
      `<span class="chip ${it.missing ? "missing" : ""}"><span class="chip-kind">${it.kind === "card" ? "Card" : "Set"}</span>` +
      `${esc(it.name)}<button type="button" class="chip-x" data-i="${i}" aria-label="Remove ${esc(it.name)}">×</button></span>`).join("");
    $("clear").hidden = state.items.length === 0;
    $("hint").textContent = state.items.length >= MAX_ITEMS
      ? `You've reached the limit of ${MAX_ITEMS}. Run the report or remove some.`
      : "Pick from the list to add it. Add up to 20 cards and box sets, or paste a list.";
  }

  function choose(i) {
    const o = state.options[i];
    if (!o) return;
    addItem(o);
    $("q").value = "";
    closeSuggestions();
    $("q").focus();
  }

  async function commitTyped() {
    const text = $("q").value.trim();
    if (!text) return false;
    const index = await loadIndex();
    for (const part of splitList(text)) addItem(resolve(index, state.kind, part));
    $("q").value = "";
    closeSuggestions();
    return true;
  }

  // --- filters ---
  function showFilters(on) {
    $("filters").hidden = !on;
    $("add-filter").hidden = on;
    if (!on) { $("rarity").value = ""; $("setfilter").value = ""; if (state.rows.length) render(); }
  }

  function refreshRarities() {
    const sel = $("rarity");
    const keep = sel.value;
    const rarities = new Set();
    state.rows.forEach((r) => (r.printings || []).forEach((p) => p.rarity && rarities.add(p.rarity)));
    sel.innerHTML = '<option value="">All rarities</option>' +
      [...rarities].sort().map((r) => `<option${r === keep ? " selected" : ""}>${esc(r)}</option>`).join("");
  }

  const visibleRows = () => applyFilters(state.rows, $("rarity").value, $("setfilter").value);

  // --- report ---
  function render() {
    const rows = visibleRows();
    const found = rows.filter((r) => !r.missing).length;
    $("results-meta").innerHTML =
      `${rows.length} search${rows.length === 1 ? "" : "es"} · ${found} found · ready in <strong>${fmtTime(state.ms)}</strong>`;

    const cards = rows.filter((r) => r.kind === "card");
    const sets = rows.filter((r) => r.kind === "set");
    let html = "";

    if (cards.length) {
      html += `<h3>Cards</h3><div class="table-wrap"><table><thead><tr><th>Card</th><th>Printings (set code · box set · rarity · released)</th></tr></thead><tbody>` +
        cards.map((r) => {
          if (r.missing) return `<tr><td class="name">${esc(r.term)}</td><td class="miss">No card in the database matches this name.</td></tr>`;
          const desc = r.desc ? `<details><summary>Description</summary><p>${esc(r.desc)}</p></details>` : "";
          const list = r.filteredOut
            ? `<span class="miss">No printings match the filters.</span>`
            : `<ul class="items">${r.printings.map((p) =>
                `<li><span class="code">${esc(p.set_code)}</span><span>${esc(p.set_name)}</span><span class="rarity">${esc(p.rarity)}</span><span class="date">${esc(year(p.date) || "—")}</span></li>`).join("")}</ul>`;
          const total = r.total != null ? r.total : r.printings.length;
          const count = r.total != null && r.total !== r.printings.length
            ? `${r.printings.length} of ${total} printings match` : `${total} printing${total === 1 ? "" : "s"}`;
          return `<tr><td class="name">${esc(r.name)}<span class="sub">${esc(typeLabel(r.type))} · ${count}</span>${desc}</td><td>${list}</td></tr>`;
        }).join("") + `</tbody></table></div>`;
    }

    if (sets.length) {
      html += `<h3>Box sets</h3><div class="table-wrap"><table><thead><tr><th>Box set</th><th>Cards (set code · card · rarity)</th></tr></thead><tbody>` +
        sets.map((r) => {
          if (r.missing) return `<tr><td class="name">${esc(r.term)}</td><td class="miss">No box set in the database matches this name or code.</td></tr>`;
          const sub = [r.set_code, year(r.date), `${r.items.length} printing${r.items.length === 1 ? "" : "s"}`].filter(Boolean).map(esc).join(" · ");
          const note = r.in_scope ? "" : `<span class="tag">Partial: lists only cards from the covered early era</span>`;
          const list = r.items.length
            ? `<ul class="items set">${r.items.map((it) =>
                `<li><span class="code">${esc(it.set_code)}</span><span>${esc(it.name)}` +
                (it.desc ? ` <details class="inline"><summary aria-label="Description">ⓘ</summary><p>${esc(it.desc)}</p></details>` : "") +
                `</span><span class="rarity">${esc(it.rarity)}</span></li>`).join("")}</ul>`
            : `<span class="miss">No covered cards in this set.</span>`;
          return `<tr><td class="name">${esc(r.name)}<span class="sub">${sub}</span>${note}</td><td>${list}</td></tr>`;
        }).join("") + `</tbody></table></div>`;
    }

    $("report").innerHTML = html;
    $("results-panel").hidden = false;
  }

  async function run(e) {
    if (e) e.preventDefault();
    if (e && e.type === "submit" && document.activeElement === $("q") && state.options.length && state.active >= 0) {
      choose(state.active);
      return;
    }
    await commitTyped();
    if (!state.items.length) { $("q").focus(); return; }
    const btn = $("run");
    btn.disabled = true;
    btn.textContent = "Running…";
    const t0 = performance.now();
    try {
      const index = await loadIndex();
      const cards = state.items.filter((i) => i.kind === "card");
      const sets = state.items.filter((i) => i.kind === "set");
      state.rows = cardRows(index, cards).concat(setRows(index, sets));
      state.ms = performance.now() - t0;
      refreshRarities();
      render();
      $("results-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      btn.disabled = false;
      btn.textContent = "Run report";
    }
  }

  function csvName() {
    return `pulse-report-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  function downloadCSV() {
    const blob = new Blob([toCSV(visibleRows())], { type: "text/csv;charset=utf-8" });
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
    try { await navigator.clipboard.writeText(toCSV(visibleRows())); btn.textContent = "Copied"; }
    catch (err) { btn.textContent = "Copy failed"; }
    setTimeout(() => (btn.textContent = "Copy CSV"), 1500);
  }

  // --- wiring ---
  $("version").textContent = "v" + VERSION;
  document.querySelectorAll(".seg").forEach((b) => b.addEventListener("click", () => setKind(b.dataset.kind)));
  $("q").addEventListener("input", updateSuggestions);
  $("q").addEventListener("focus", () => { if ($("q").value) updateSuggestions(); });
  $("q").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!state.options.length) return;
      e.preventDefault();
      const n = state.options.length;
      state.active = (state.active + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      renderSuggestions();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (state.options.length && state.active >= 0) choose(state.active);
      else commitTyped();
    } else if (e.key === "Escape") {
      closeSuggestions();
    } else if (e.key === "Backspace" && !$("q").value && state.items.length) {
      state.items.pop();
      renderChips();
    }
  });
  $("q").addEventListener("paste", (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    if (splitList(text).length > 1) {
      e.preventDefault();
      $("q").value = text;
      commitTyped();
    }
  });
  $("suggestions").addEventListener("mousedown", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li) { e.preventDefault(); choose(Number(li.dataset.i)); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".combo")) closeSuggestions(); });
  $("chips").addEventListener("click", (e) => {
    const x = e.target.closest(".chip-x");
    if (x) { state.items.splice(Number(x.dataset.i), 1); renderChips(); }
  });
  $("clear").addEventListener("click", () => {
    state.items = []; renderChips(); $("results-panel").hidden = true; state.rows = [];
  });
  $("add-filter").addEventListener("click", () => { showFilters(true); $("rarity").focus(); });
  $("clear-filters").addEventListener("click", () => showFilters(false));
  $("rarity").addEventListener("change", () => state.rows.length && render());
  $("setfilter").addEventListener("input", () => state.rows.length && render());
  $("search-form").addEventListener("submit", run);
  $("example").addEventListener("click", async () => {
    const index = await loadIndex();
    state.items = [];
    EXAMPLE.forEach((x) => addItem(resolve(index, x.kind, x.text)));
    run();
  });
  $("download-csv").addEventListener("click", downloadCSV);
  $("copy-csv").addEventListener("click", copyCSV);
  loadIndex();
})();
