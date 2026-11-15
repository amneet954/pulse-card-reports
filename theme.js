// Light / dark mode toggle: System (default), Light, Dark.
// Self-contained: remove this file, theme.css and #theme-slot in index.html to drop the feature.
// Like the rest of the app, the choice isn't saved: every visit starts on System.
(function () {
  "use strict";
  const slot = document.getElementById("theme-slot");
  if (!slot) return;
  const OPTIONS = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];
  let current = "system";

  function apply(value) {
    current = value;
    if (value === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", value);
    render();
  }

  function render() {
    slot.innerHTML = `<div class="theme-toggle" role="radiogroup" aria-label="Color theme">` +
      OPTIONS.map((o) => `<button type="button" role="radio" aria-checked="${o.value === current}" data-theme-value="${o.value}">${o.label}</button>`).join("") +
      `</div>`;
  }

  slot.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-theme-value]");
    if (b) apply(b.dataset.themeValue);
  });
  render();
})();
