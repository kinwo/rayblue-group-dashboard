// Structured page extractor for the 16 Nov 2026 E2E run: every figure the oracle can check.
(() => {
  const card = (title) => [...document.querySelectorAll("h2")].find((h) => h.textContent === title)?.closest("[role=region], section");
  const num = (s) => Number(String(s).replace(/[^\d]/g, ""));
  const tiles = card("Listing totals");
  const kpi = [...tiles.querySelectorAll("li")].map((li) => [...li.children].map((c) => c.textContent));
  const trendCard = [...document.querySelectorAll("h2")].find((h) => /^New listings per /.test(h.textContent)).closest("[role=region]");
  const trendRows = [...trendCard.querySelectorAll("tbody tr")].map((r) => [r.cells[0]?.textContent ?? r.querySelector("th").textContent, r.querySelector("td").textContent]);
  const stateCard = card("New listings by state");
  const bars = [...stateCard.querySelectorAll("li")].map((li) => ({
    state: li.querySelector("abbr").textContent,
    agencies: li.textContent.match(/(\d+) agenc(y|ies)/)[0],
    count: num(li.lastElementChild.textContent),
    widthPct: parseFloat(li.querySelector("[style*=width]").style.width),
    barOpacity: getComputedStyle(li.querySelector("[style*=width]")).opacity,
    rowOpacity: getComputedStyle(li).opacity,
  }));
  const table = [...document.querySelectorAll("table")].find((t) => t.caption?.textContent.includes("Top agencies"));
  const headers = [...table.tHead.rows[0].cells].map((th) => ({ text: th.textContent.trim(), sort: th.getAttribute("aria-sort"), scope: th.getAttribute("scope") }));
  const rows = [...table.tBodies[0].rows].map((r) => ({ cells: [...r.cells].map((c) => c.textContent.trim()), selected: r.getAttribute("aria-selected") }));
  return {
    url: location.pathname + location.search,
    h1: [...document.querySelectorAll("h1")].map((h) => h.textContent),
    meta: document.querySelector("h1").nextElementSibling?.textContent,
    stale: !!document.querySelector("[role=alert]"),
    context: document.querySelector('[data-slot="sidebar-header"] p:nth-of-type(2)')?.textContent ?? null,
    controls: {
      state: document.querySelector('[data-slot="select-trigger"]')?.textContent.trim(),
      agency: document.querySelector('button[role="combobox"]:not([data-slot])')?.textContent.trim(),
      tab: document.querySelector('[role=tab][aria-selected=true]')?.textContent,
    },
    kpi,
    trendTitle: trendCard.querySelector("h2").textContent,
    trendDesc: trendCard.querySelector('[data-slot="card-description"]')?.textContent,
    chartLabel: trendCard.querySelector("[role=img]")?.getAttribute("aria-label"),
    trendRows,
    stateDesc: stateCard.querySelector('[data-slot="card-description"]')?.textContent,
    bars,
    tableDesc: card("Top agencies").querySelector('[data-slot="card-description"]')?.textContent,
    headers,
    rows,
    scrollW: document.scrollingElement.scrollWidth,
    innerW: innerWidth,
  };
})()
