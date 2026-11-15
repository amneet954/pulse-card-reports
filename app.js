// Pulse Card Reports v1.64 — see CLAUDE.md for scope and CHANGELOG.md for history.
//
// Data model (data/catalog.json, schema v2) works like three related tables:
//   cards     — one row per card
//   sets      — one row per box set
//   printings — one row per card printed in a set; joins cards to sets
// A report is a list of printings (from the searched cards and box sets), projected onto the
// metrics picked in the sidebar, with duplicate rows removed.
(function () {
  "use strict";

  const VERSION = "1.64";
  const MAX_ITEMS = 20;
  const MAX_SUGGESTIONS = 8;
  const MAX_ROWS_SHOWN = 50; // the screen shows a preview; CSV export always includes every row

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

  // ---------- Data model ----------

  function buildIndex(data) {
    const cards = data.cards.map((c) => Object.assign({ key: norm(c.name) }, c));
    const sets = data.sets.map((s) => Object.assign({ key: norm(s.set_name), codeKey: norm(s.set_code) }, s));
    const cardById = new Map(cards.map((c) => [c.id, c]));
    const setById = new Map(sets.map((s) => [s.id, s]));
    const byCard = new Map();
    const bySet = new Map();
    const printings = [];
    for (const p of data.printings) {
      const card = cardById.get(p.card_id);
      const set = setById.get(p.set_id);
      if (!card || !set) continue;
      const row = { card, set, code: p.code, rarity: p.rarity };
      printings.push(row);
      if (!byCard.has(card.id)) byCard.set(card.id, []);
      byCard.get(card.id).push(row);
      if (!bySet.has(set.id)) bySet.set(set.id, []);
      bySet.get(set.id).push(row);
    }
    return { cards, sets, cardById, setById, printings, byCard, bySet, scope: data.scope || null };
  }

  function suggest(index, kind, text, limit) {
    const q = norm(text);
    if (!q) return [];
    const out = [];
    if (kind === "card") {
      for (const c of index.cards) {
        const s = score(q, c.key);
        if (s !== null) out.push({ s, len: c.name.length, item: { kind: "card", id: c.id, name: c.name, type: c.card_type } });
      }
    } else {
      for (const set of index.sets) {
        const sc = set.codeKey === q ? 0 : set.codeKey && set.codeKey.startsWith(q) ? 1 : null;
        const sn = score(q, set.key);
        const s = sc !== null && (sn === null || sc <= sn) ? sc : sn;
        if (s !== null) {
          out.push({ s, len: set.set_name.length, item: { kind: "set", id: set.id, name: set.set_name, set_code: set.set_code, date: set.date } });
        }
      }
    }
    out.sort((a, b) => a.s - b.s || a.len - b.len || a.item.name.localeCompare(b.item.name));
    return out.slice(0, limit || MAX_SUGGESTIONS).map((o) => o.item);
  }

  // Best single match for typed or pasted text, or a "missing" item.
  function resolve(index, kind, text) {
    return suggest(index, kind, text, 1)[0] || { kind, name: text.trim(), missing: true };
  }

  function splitList(text) {
    return String(text).split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
  }

  // ---------- Metrics ----------

  const year = (d) => (d ? String(d).slice(0, 4) : "");
  const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

  const METRICS = [
    { key: "card_name", group: "Card", label: "Card name", get: (p) => p.card.name },
    { key: "card_type", group: "Card", label: "Card type", get: (p) => p.card.card_type },
    { key: "attribute", group: "Card", label: "Attribute", get: (p) => titleCase(p.card.attribute) || "—" },
    { key: "card_desc", group: "Card", label: "Card description", get: (p) => p.card.desc || "", long: true },
    { key: "rarity", group: "Card", label: "Card rarity", get: (p) => p.rarity || "" },
    { key: "print_code", group: "Card", label: "Card set code", get: (p) => p.code || "", mono: true },
    { key: "box_name", group: "Box set", label: "Box name", get: (p) => p.set.set_name },
    { key: "box_code", group: "Box set", label: "Box set code", get: (p) => p.set.set_code || "", mono: true },
    { key: "box_year", group: "Box set", label: "Box year", get: (p) => year(p.set.date) || "—" },
  ];
  const DEFAULT_METRICS = ["card_name", "card_type", "rarity", "print_code", "box_name", "box_year"];

  // Printings for the filtered cards and box sets, oldest first within each card.
  // An empty filter means the whole catalog.
  function collectPrintings(index, items) {
    const seen = new Set();
    const out = [];
    const add = (p) => { if (!seen.has(p)) { seen.add(p); out.push(p); } };
    if (!items.length) index.printings.forEach(add);
    for (const it of items) {
      if (it.missing) continue;
      const list = it.kind === "card" ? index.byCard.get(it.id) : index.bySet.get(it.id);
      (list || []).forEach(add);
    }
    return out.sort((a, b) =>
      a.card.name.localeCompare(b.card.name) ||
      (a.set.date || "9999").localeCompare(b.set.date || "9999") ||
      a.code.localeCompare(b.code, undefined, { numeric: true }) ||
      a.rarity.localeCompare(b.rarity));
  }

  // Project printings onto the chosen metrics and drop duplicate rows.
  function buildReport(index, items, metricKeys) {
    const columns = METRICS.filter((m) => metricKeys.includes(m.key));
    const printings = collectPrintings(index, items);
    const seen = new Set();
    const rows = [];
    for (const p of printings) {
      const values = columns.map((m) => m.get(p));
      const k = values.join("\u0001");
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push(values);
    }
    return { columns, rows, printings: printings.length, missing: items.filter((i) => i.missing) };
  }

  // What the screen shows: the metrics ticked now. A metric ticked after the report ran has no
  // data yet, so its cells show "--" until the report is run again.
  const PENDING = "--";
  function reportView(report, metricKeys) {
    const columns = METRICS.filter((m) => metricKeys.includes(m.key)).map((m) => {
      const src = report.columns.findIndex((c) => c.key === m.key);
      return Object.assign({}, m, { src, pending: src < 0 });
    });
    const rows = report.rows.map((r) => columns.map((c) => (c.pending ? PENDING : r[c.src])));
    return { columns, rows, pending: columns.some((c) => c.pending) };
  }

  // Sort report rows by one column. Blank or "—" values always go last; numbers and set
  // codes sort naturally ("MFC-2" before "MFC-10", 2003 before 2016).
  function sortRows(report, key, dir) {
    const i = report.columns.findIndex((c) => c.key === key);
    if (i < 0 || !dir) return report.rows;
    const sign = dir === "desc" ? -1 : 1;
    const empty = (v) => v === "" || v === "—" || v === PENDING || v == null;
    return report.rows.slice().sort((a, b) => {
      const x = a[i], y = b[i];
      if (empty(x) || empty(y)) return empty(x) === empty(y) ? 0 : empty(x) ? 1 : -1;
      return sign * String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
    });
  }

  // ---------- CSV ----------

  function csvCell(v) {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(report, rows) {
    return [report.columns.map((c) => c.label)].concat(rows || report.rows)
      .map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  // Sample fallback (old nested format) -> schema v2.
  function sampleToData(sample) {
    const sets = sample.sets.map((s, id) => ({ id, set_name: s.set_name, set_code: s.set_code, date: s.date || null }));
    const setId = new Map(sets.map((s) => [s.set_name, s.id]));
    const cards = [];
    const printings = [];
    sample.cards.forEach((c, id) => {
      cards.push({ id, name: c.name, card_type: c.card_type || "Monster", attribute: c.attribute || null, desc: c.desc });
      c.card_sets.forEach((p) => {
        if (setId.has(p.set_name)) printings.push({ card_id: id, set_id: setId.get(p.set_name), code: p.set_code, rarity: p.set_rarity });
      });
    });
    return { cards, sets, printings };
  }

  const core = { norm, score, buildIndex, suggest, resolve, splitList, METRICS, DEFAULT_METRICS,
    collectPrintings, buildReport, reportView, sortRows, toCSV, sampleToData };
  if (typeof module !== "undefined" && module.exports) { module.exports = core; return; }

  // ---------- UI ----------

  const $ = (id) => document.getElementById(id);
  // Nothing is saved between visits: a refresh starts with no metrics, no search and no report.
  const state = { kind: "card", items: [], index: null, metrics: [], report: null, ms: 0, active: -1, options: [],
    sort: { key: null, dir: null }, lastRun: null };
  const currentView = () => reportView(state.report, state.metrics);
  const sortedRows = (view) => sortRows(view, state.sort.key, state.sort.dir);

  const EXAMPLE = {
    // The MVP report: the six metrics every Pulse report is built around.
    metrics: ["card_name", "card_type", "rarity", "print_code", "box_name", "box_year"],
    items: [{ kind: "set", text: "Quarter Century Stampede" }],
  };
  const PLACEHOLDER = {
    card: "Start typing a card name, e.g. red-eyes",
    set: "Start typing a box set or code, e.g. Magician's Force or MFC",
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const fmtTime = (ms) => (ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(2)} s`);


  async function loadIndex() {
    if (state.index) return state.index;
    try {
      const res = await fetch("data/catalog.json", { cache: "no-cache" });
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

  // --- metrics sidebar ---
  function renderMetrics() {
    // "Select all" shows when anything is unticked; "Clear all" shows when anything is ticked.
    const controls = (scope, keys) => {
      const on = keys.filter((k) => state.metrics.includes(k)).length;
      return `<span class="metric-actions">` +
        (on < keys.length ? `<button type="button" class="link small" data-scope="${esc(scope)}" data-act="all">Select all</button>` : "") +
        (on > 0 ? `<button type="button" class="link small" data-scope="${esc(scope)}" data-act="none">Clear all</button>` : "") +
        `</span>`;
    };
    $("metrics-actions").innerHTML = controls("*", METRICS.map((m) => m.key));
    const groups = [...new Set(METRICS.map((m) => m.group))];
    $("metric-groups").innerHTML = groups.map((g) => {
      const ms = METRICS.filter((m) => m.group === g);
      return `<fieldset class="metric-group"><div class="metric-group-head"><legend>${esc(g)}</legend>` +
        controls(g, ms.map((m) => m.key)) + `</div>` +
        ms.map((m) => `<label class="metric"><input type="checkbox" autocomplete="off" value="${m.key}"${state.metrics.includes(m.key) ? " checked" : ""}>` +
          `<span>${esc(m.label)}</span></label>`).join("") + `</fieldset>`;
    }).join("");
    updateRunState();
  }

  function metricAction(e) {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const scopeKeys = METRICS.filter((m) => b.dataset.scope === "*" || m.group === b.dataset.scope).map((m) => m.key);
    const keys = new Set(state.metrics);
    scopeKeys.forEach((k) => (b.dataset.act === "all" ? keys.add(k) : keys.delete(k)));
    setMetrics([...keys]);
  }

  function setMetrics(keys) {
    // keep sidebar order
    state.metrics = METRICS.map((m) => m.key).filter((k) => keys.includes(k));
    renderMetrics();
    if (state.report) {
      if (state.sort.key && !state.metrics.includes(state.sort.key)) state.sort = { key: null, dir: null };
      render(); // removed metrics disappear; new ones show "--" until the report runs again
    }
    updateStale();
  }

  function updateRunState() {
    const none = state.metrics.length === 0;
    $("run").disabled = none;
    $("run").title = none ? "Pick at least one metric" : "";
    $("metrics-hint").textContent = none ? "Pick at least one metric to run a report." : "Pick the columns for your report.";
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
      const label = o.kind === "set" && o.set_code ? `${o.name} (${o.set_code})` : o.name;
      const meta = o.kind === "set" ? year(o.date) : o.type;
      return `<li role="option" id="opt-${i}" class="${i === state.active ? "active" : ""}" aria-selected="${i === state.active}" data-i="${i}">` +
        `<span>${esc(label)}</span><span class="opt-meta">${esc(meta)}</span></li>`;
    }).join("");
    list.hidden = false;
    $("q").setAttribute("aria-expanded", "true");
    $("q").setAttribute("aria-activedescendant", state.active >= 0 ? `opt-${state.active}` : "");
  }

  async function updateSuggestions() {
    const text = $("q").value;
    if (!norm(text)) { closeSuggestions(); return; }
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
    $("chips").innerHTML = state.items.map((it, i) => {
      const label = it.kind === "set" && it.set_code ? `${it.name} (${it.set_code})` : it.name;
      return `<span class="chip ${it.missing ? "missing" : ""}"><span class="chip-kind">${it.kind === "card" ? "Card" : "Set"}</span>` +
        `${esc(label)}<button type="button" class="chip-x" data-i="${i}" aria-label="Remove ${esc(it.name)}">×</button></span>`;
    }).join("");
    $("clear").hidden = state.items.length === 0 && !state.report;
    $("hint").hidden = state.items.length < MAX_ITEMS;
    $("hint").textContent = `You've reached the limit of ${MAX_ITEMS}. Run the report or remove some.`;
    updateStale(); // the report itself only changes when it runs again
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

  // --- stale warning ---
  // After a report runs, changing the filter or the metrics doesn't change the data shown.
  // A warning above the filter asks for a re-run instead.
  const filterKey = () => state.items.map((i) => `${i.kind}:${i.name}`).join("|");
  function updateStale() {
    const stale = !!state.report && !!state.lastRun &&
      (state.lastRun.filter !== filterKey() || state.lastRun.metrics !== state.metrics.join("|"));
    $("stale").hidden = !stale;
    $("run").classList.toggle("attention", stale);
  }

  // --- report ---
  function render() {
    const r = state.report;
    const view = currentView();
    const n = view.rows.length;
    // Total rows the report holds (all of them go into the CSV export).
    $("results-meta").innerHTML =
      `<strong>${n.toLocaleString()} row${n === 1 ? "" : "s"}</strong>`;

    const miss = $("missing");
    miss.hidden = !r.missing.length;
    miss.textContent = r.missing.length
      ? `No match for: ${r.missing.map((m) => `“${m.name}”`).join(", ")}.` : "";

    $("pending").hidden = !view.pending;

    const all = sortedRows(view);
    const shown = all.slice(0, MAX_ROWS_SHOWN);
    const icon = (k) => (state.sort.key !== k ? "↕" : state.sort.dir === "asc" ? "▲" : "▼");
    const aria = (k) => (state.sort.key !== k ? "none" : state.sort.dir === "asc" ? "ascending" : "descending");
    const head = (c) => c.pending
      ? `<th class="pending-col" title="Run the report again to fill this column"><span class="sort pending">${esc(c.label)}</span></th>`
      : `<th class="${c.long ? "long" : ""}" aria-sort="${aria(c.key)}">` +
        `<button type="button" class="sort${state.sort.key === c.key ? " on" : ""}" data-k="${c.key}" ` +
        `aria-label="Sort by ${esc(c.label)}">${esc(c.label)}<span class="sort-icon" aria-hidden="true">${icon(c.key)}</span></button></th>`;
    const cols = view.columns.length || 1;
    $("report").innerHTML =
      `<thead><tr>${view.columns.length ? view.columns.map(head).join("") : "<th>No metrics selected</th>"}</tr></thead>` +
      `<tbody>${!view.columns.length
        ? `<tr><td class="miss">Tick a metric in the sidebar and run the report.</td></tr>`
        : shown.length
        ? shown.map((row) => `<tr>${row.map((v, i) => {
            const c = view.columns[i];
            return `<td class="${c.pending ? "pending-cell" : ""}${c.mono ? " code" : ""}${c.long ? " long" : ""}">${esc(v)}</td>`;
          }).join("")}</tr>`).join("")
        : `<tr><td class="miss" colspan="${cols}">No rows. Add a card or box set that's in the catalog.</td></tr>`}</tbody>`;

    const t = $("truncated");
    t.hidden = all.length <= MAX_ROWS_SHOWN;
    t.innerHTML = `Showing the first ${MAX_ROWS_SHOWN} of ${all.length.toLocaleString()} rows. ` +
      `To get the full report, <button type="button" class="link" id="export-more">export it as a CSV</button>.`;
    $("results-panel").hidden = false;
  }

  // Runs the report. keys = the metrics to fetch (the ticked ones on Run; the report's existing
  // columns when only the search changed, so new metrics still need a Run).
  function rebuild(keys) {
    const t0 = performance.now();
    state.report = buildReport(state.index, state.items, keys || state.metrics);
    state.ms = performance.now() - t0;
    state.lastRun = { filter: filterKey(), metrics: state.metrics.join("|"), items: state.items.slice() };
    if (state.sort.key && !state.metrics.includes(state.sort.key)) state.sort = { key: null, dir: null };
    render();
    updateStale();
    $("clear").hidden = false;
  }

  async function run(e) {
    if (e) e.preventDefault();
    await commitTyped();
    if (!state.metrics.length) return;
    const btn = $("run");
    btn.disabled = true;
    btn.textContent = "Running…";
    try {
      await loadIndex();
      rebuild();
      $("results-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      btn.textContent = "Run report";
      updateRunState();
    }
  }

  function downloadCSV() {
    if (!state.report) return;
    const view = currentView();
    const blob = new Blob([toCSV(view, sortedRows(view))], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pulse-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copyCSV() {
    if (!state.report) return;
    const btn = $("copy-csv");
    const view = currentView();
    try { await navigator.clipboard.writeText(toCSV(view, sortedRows(view))); btn.textContent = "Copied"; }
    catch (err) { btn.textContent = "Copy failed"; }
    setTimeout(() => (btn.textContent = "Copy CSV"), 1500);
  }

  // --- wiring ---
  $("version").textContent = "v" + VERSION;
  renderMetrics();
  $("metric-groups").addEventListener("submit", (e) => e.preventDefault());
  $("metric-groups").addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    const keys = new Set(state.metrics);
    if (e.target.checked) keys.add(e.target.value); else keys.delete(e.target.value);
    setMetrics([...keys]);
  });
  $("metric-groups").addEventListener("click", metricAction);
  $("metrics-actions").addEventListener("click", metricAction);
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
  document.addEventListener("click", (e) => { if (!e.target.closest("#q-combo")) closeSuggestions(); });
  $("chips").addEventListener("click", (e) => {
    const x = e.target.closest(".chip-x");
    if (x) { state.items.splice(Number(x.dataset.i), 1); renderChips(); }
  });
  // Clear all empties the filter and the report.
  $("clear").addEventListener("click", () => {
    state.items = [];
    state.report = null;
    state.lastRun = null;
    state.sort = { key: null, dir: null };
    $("results-panel").hidden = true;
    $("report").innerHTML = "";
    $("results-meta").innerHTML = "";
    $("truncated").hidden = true;
    renderChips();
  });
  // Try an example: the MVP report (six metrics) for Quarter Century Stampede.
  $("example").addEventListener("click", async () => {
    const index = await loadIndex();
    state.items = [];
    EXAMPLE.items.forEach((x) => addItem(resolve(index, x.kind, x.text)));
    setMetrics(EXAMPLE.metrics);
    run();
  });
  $("search-form").addEventListener("submit", run);
  $("download-csv").addEventListener("click", downloadCSV);
  $("report").addEventListener("click", (e) => {
    const b = e.target.closest("button.sort");
    if (!b) return;
    const k = b.dataset.k;
    state.sort = { key: k, dir: state.sort.key === k && state.sort.dir === "asc" ? "desc" : "asc" };
    render();
  });
  $("truncated").addEventListener("click", (e) => { if (e.target.id === "export-more") downloadCSV(); });
  $("copy-csv").addEventListener("click", copyCSV);
  loadIndex();
})();
