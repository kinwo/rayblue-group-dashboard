"""Drive agent-browser through scopes x periods and compare every figure on the page with the oracle.

Usage (server on :3000, AGENT_BROWSER_SESSION set): python3 check_figures.py > figures.txt
"""
import json, math, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:3000/rental-analytics"
X = json.load(open(os.path.join(HERE, "expected.json")))
EXTRACT = open(os.path.join(HERE, "extract.js")).read()
STATES = {"NSW": "New South Wales", "VIC": "Victoria", "QLD": "Queensland", "WA": "Western Australia",
          "SA": "South Australia", "TAS": "Tasmania", "ACT": "Australian Capital Territory", "NT": "Northern Territory"}
AG = {int(k): v for k, v in X["agencies"].items()}
BY_NAME = {v["name"]: k for k, v in AG.items()}


def ab(*args, stdin=None):
    r = subprocess.run(["agent-browser", *args], input=stdin, capture_output=True, text=True, timeout=120)
    if r.returncode:
        raise RuntimeError(f"agent-browser {args}: {r.stderr or r.stdout}")
    return r.stdout


def fmt_count(n): return f"{n:,}"
def js_round(x): return math.floor(x + 0.5)
def fmt_share(s): return f"{js_round(s * 1000) / 10:.1f}%"
def fmt_change(cur, prev):
    if prev == 0: return "—"
    pct = js_round((cur - prev) / prev * 100)
    return "0%" if pct == 0 else (f"+{pct:,}%" if pct > 0 else f"−{abs(pct):,}%")


def check(state, agency, g):
    q = [f"state={state}"] if state else []
    q += [f"agencyId={agency}"] if agency else []
    q += [f"granularity={g}"] if g != "daily" else []
    url = BASE + ("?" + "&".join(q) if q else "")
    for _ in range(6):  # the app rate-limits page loads (ADR 0004): wait out a 429 and retry
        ab("open", url)
        if "Too many requests" not in ab("get", "title") + ab("eval", "document.body.innerText.slice(0, 40)"):
            break
        time.sleep(15)
    ab("wait", "--text", "Top agencies")
    p = json.loads(ab("eval", "--stdin", stdin=EXTRACT))
    errs = []
    def eq(what, got, want):
        if got != want: errs.append(f"{what}: got {got!r}, want {want!r}")

    hl_state = AG[agency]["state"] if agency else state
    scope_x = AG[agency] if agency else X["scopes"][state or "group"]
    k = scope_x["kpi"]
    eq("kpi today", p["kpi"][0][1], fmt_count(k["today"]))
    eq("kpi week", p["kpi"][1][1], fmt_count(k["week"]))
    eq("kpi month", p["kpi"][2][1], fmt_count(k["month"]))
    if not p["kpi"][0][2].endswith(f"last Saturday {fmt_count(k['lastSameDay'])}"): errs.append(f"kpi today note {p['kpi'][0][2]!r}")
    eq("kpi week note", p["kpi"][1][2], f"Week to date · last week {fmt_count(k['lastWeek'])}")
    eq("kpi month note", p["kpi"][2][2], f"Month to date · September {fmt_count(k['lastMonth'])}")
    n_ag = 1 if agency else sum(1 for a in AG.values() if not state or a["state"] == state)
    eq("kpi agencies", p["kpi"][3][1], fmt_count(n_ag))
    eq("kpi agencies note", p["kpi"][3][2], f"In {STATES[hl_state]}" if hl_state else "Across 8 states and territories")

    tr = [r["count"] for r in scope_x["trend"][g]]
    eq("trend rows", len(p["trendRows"]), len(tr))
    eq("trend counts", [int(c.replace(",", "")) for _, c in p["trendRows"]], tr)
    eq("trend title", p["trendTitle"], f"New listings per {dict(daily='day', weekly='week', monthly='month')[g]}")
    if p["chartLabel"] and tr:
        if f"Latest {fmt_count(tr[-1])}, peak {fmt_count(max(tr))}." not in p["chartLabel"]: errs.append(f"chart label {p['chartLabel']!r}")
    if p["trendRows"] and not p["trendRows"][-1][0].endswith("(to date)"): errs.append(f"last bucket not partial: {p['trendRows'][-1][0]!r}")

    bs = X["byState"][g]
    eq("bars order", [b["state"] for b in p["bars"]], sorted(bs, key=lambda s: (-bs[s], list(STATES).index(s))))
    mx = max(bs.values())
    for b in p["bars"]:
        eq(f"bar {b['state']} count", b["count"], bs[b["state"]])
        if abs(b["widthPct"] - (bs[b["state"]] / mx * 100 if mx else 0)) > 0.01: errs.append(f"bar {b['state']} width {b['widthPct']}")
        n = sum(1 for a in AG.values() if a["state"] == b["state"])
        eq(f"bar {b['state']} agencies", b["agencies"], f"{n} agency" if n == 1 else f"{n} agencies")
        want_op = "0.35" if hl_state and b["state"] != hl_state else "1"
        eq(f"bar {b['state']} opacity", b["barOpacity"], want_op)
        eq(f"row {b['state']} opacity", b["rowOpacity"], "1")
    eq("sum bars = sum trend", sum(bs.values()) if not (state or agency) else None, sum(tr) if not (state or agency) else None)

    share_hdr = p["headers"][3]["text"]
    pool_state = None if share_hdr == "Share of group" else share_hdr.removeprefix("Share of ")
    eq("share header", pool_state, state)  # the table is scoped by the state filter only (AC-AGY-1)
    pool = {i: a for i, a in AG.items() if not pool_state or a["state"] == pool_state}
    total = sum(a["range"][g] for a in pool.values())
    top = sorted((a["range"][g] for a in pool.values()), reverse=True)[:8]
    if not pool:
        eq("empty table", [r["cells"] for r in p["rows"]], [["No agencies match these filters."]])
        p["rows"] = []
    counts = [int(r["cells"][2].replace(",", "")) for r in p["rows"]]
    main_rows = [r for r in p["rows"] if not (agency and r["selected"] == "true" and len(p["rows"]) == 9)]
    eq("top 8 counts", [int(r["cells"][2].replace(",", "")) for r in main_rows][:8], top[:len(main_rows)])
    eq("rows descending", counts[:8], sorted(counts[:8], reverse=True))
    for r in p["rows"]:
        name, st, cnt, share, chg = r["cells"]
        a = AG[BY_NAME[name]]
        eq(f"{name} state", st, a["state"])
        eq(f"{name} count", cnt, fmt_count(a["range"][g]))
        eq(f"{name} share", share, fmt_share(a["range"][g] / total) if total else "0.0%")
        eq(f"{name} change", chg, fmt_change(a["range"][g], a["prev"][g]))
    if agency:
        sel = [r["cells"][0] for r in p["rows"] if r["selected"] == "true"]
        eq("selected row", sel, [AG[agency]["name"]])
    eq("aria-sort on one header", [h["text"] for h in p["headers"] if h["sort"]], ["New listings"])
    eq("header scope", {h["scope"] for h in p["headers"]}, {"col"})
    eq("no horizontal scroll", p["scrollW"] <= p["innerW"], True)
    return url, errs, p


def main():
    cases = [(None, None), ("NSW", None), ("VIC", None), ("QLD", None), ("TAS", None), ("WA", None),
             (None, 13), (None, 16), ("QLD", 29), (None, 7)]
    fails = 0
    for state, agency in cases:
        for g in ("daily", "weekly", "monthly"):
            url, errs, p = check(state, agency, g)
            fails += bool(errs)
            print(("PASS " if not errs else "FAIL ") + url + f"  kpi={[t[1] for t in p['kpi']]} rows={len(p['rows'])}")
            for e in errs: print("   - " + e)
    print(f"\n{30 - fails}/30 views match the oracle")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
