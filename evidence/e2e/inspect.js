// Page inspector for the E2E run: landmarks, KPI styles, state bars, top-agency table.
(() => {
  const card = (title) => [...document.querySelectorAll('h2')].find((h) => h.textContent === title)?.closest('section,[role=region]');
  const leafNum = (root) => [...root.querySelectorAll('*')].find((e) => /^[\d,]+$/.test(e.textContent.trim()) && e.children.length === 0);
  const tiles = card('Listing totals');
  const vals = [...tiles.querySelectorAll('li')].map((li) => { const el = leafNum(li); const cs = getComputedStyle(el); return { v: el.textContent, fvn: cs.fontVariantNumeric, color: cs.color }; });
  const table = [...document.querySelectorAll('table')].find((t) => t.caption?.textContent.includes('Top agencies'));
  const rows = [...table.querySelectorAll('tbody tr')].map((r) => [...r.cells].map((c) => c.textContent.trim()).join(' | ') + (r.getAttribute('aria-selected') === 'true' ? ' [selected]' : ''));
  const cells = [...table.querySelectorAll('tbody tr')[0].cells].map((c) => `${c.textContent.trim()}:${getComputedStyle(c).textAlign}:${getComputedStyle(c).fontVariantNumeric}`);
  const headers = [...table.querySelectorAll('thead th')].map((th) => `${th.textContent.trim()}:${th.getAttribute('aria-sort')}:${th.querySelector('button') ? 'button' : '-'}`);
  const stateCard = card('New listings by state');
  const bars = [...stateCard.querySelectorAll('li')].map((li) => { const b = [...li.querySelectorAll('*')].find((e) => e.style.width); return `${li.querySelector('abbr')?.textContent} ${li.textContent.match(/\d+ agenc\w+/)?.[0]} w=${b?.style.width}/${Math.round(b?.getBoundingClientRect().width)}px op=${getComputedStyle(b).opacity} n=${li.textContent.match(/(\d[\d,]*)$/)?.[1]}`; });
  const trend = card(document.querySelector('h2:nth-of-type(1)') && [...document.querySelectorAll('h2')][1].textContent);
  return {
    url: location.search, lang: document.documentElement.lang, navs: document.querySelectorAll('nav').length, mains: document.querySelectorAll('main').length, h1: [...document.querySelectorAll('h1')].map((h) => h.textContent),
    meta: document.querySelector('h1').nextElementSibling?.textContent,
    context: document.querySelector('nav')?.previousElementSibling?.textContent ?? null,
    links: [...document.querySelectorAll('nav a')].map((a) => `${a.textContent.trim()}:${a.getAttribute('aria-current')}`),
    postForms: document.querySelectorAll('form[method=post i]').length, cookie: document.cookie, storage: localStorage.length + sessionStorage.length,
    kpi: vals, kpiNotes: [...tiles.querySelectorAll('li')].map((li) => li.textContent), inkColor: getComputedStyle(document.querySelector('h1')).color,
    trendTitle: [...document.querySelectorAll('h2')][1].textContent, trendDesc: trend.querySelector('p')?.textContent, legend: trend.textContent.match(/All Rayblue agencies|Queensland|Victoria|New South Wales|Rayblue [A-Z][\w ]+?(?=\d|$)/)?.[0],
    chartLabel: document.querySelector('[role=img]')?.getAttribute('aria-label'),
    trendRows: [...trend.querySelectorAll('tbody tr')].map((r) => r.textContent),
    stateDesc: stateCard.querySelector('p')?.textContent, bars,
    agyDesc: card('Top agencies').querySelector('p')?.textContent, caption: table.caption.textContent, headers, cells, rows,
    scrollW: document.scrollingElement.scrollWidth, innerW: innerWidth,
  };
})()
