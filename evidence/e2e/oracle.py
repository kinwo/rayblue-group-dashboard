"""Independent expected-figures oracle for the E2E run (not the app's services).

Reads data/rayblue.db with plain SQL and buckets in Australia/Sydney with zoneinfo.
Usage: python3 evidence/e2e/oracle.py > evidence/e2e/expected.json
"""
import json, sqlite3, sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

SYD = ZoneInfo("Australia/Sydney")
db = sqlite3.connect(sys.argv[1] if len(sys.argv) > 1 else "data/rayblue.db")
as_of = db.execute("select as_of from dataset_meta").fetchone()[0]
agencies = {i: (n, s) for i, n, s in db.execute("select id, name, state from agencies")}
rows = [(a, t) for a, t in db.execute("select agency_id, listed_date from listings")]

def ms(dt): return int(dt.timestamp() * 1000)
def local(t): return datetime.fromtimestamp(t / 1000, SYD)
def day0(d): return datetime(d.year, d.month, d.day, tzinfo=SYD)
def add_months(d, n):
    m = d.month - 1 + n
    return datetime(d.year + m // 12, m % 12 + 1, 1, tzinfo=SYD)

now = local(as_of)
today = day0(now); week = day0(now - timedelta(days=now.weekday())); month = datetime(now.year, now.month, 1, tzinfo=SYD)

def wall(d, delta_days): return day0(d.replace(tzinfo=None) + timedelta(days=delta_days)).replace(tzinfo=SYD)

def buckets(gran, start, n):
    if gran == "daily": return [wall(start, i) for i in range(n + 1)]
    if gran == "weekly": return [wall(start, 7 * i) for i in range(n + 1)]
    return [add_months(start, i) for i in range(n + 1)]

TREND = {"daily": buckets("daily", wall(today, -13), 14), "weekly": buckets("weekly", wall(week, -77), 12), "monthly": buckets("monthly", add_months(month, -11), 12)}
PREV = {"daily": buckets("daily", wall(today, -27), 14), "weekly": buckets("weekly", wall(week, -161), 12), "monthly": buckets("monthly", add_months(month, -23), 12)}

def count(pred, a, b): return sum(1 for ag, t in rows if pred(ag) and ms(a) <= t < b and t <= as_of)
def scope_pred(state=None, agency=None):
    if agency: return lambda a: a == agency
    if state: return lambda a: agencies[a][1] == state
    return lambda a: True

def kpis(p):
    return {
        "today": count(p, today, as_of + 1), "lastSameDay": count(p, wall(today, -7), ms(wall(today, -6))),
        "week": count(p, week, as_of + 1), "lastWeek": count(p, wall(week, -7), ms(week)),
        "month": count(p, month, as_of + 1), "lastMonth": count(p, add_months(month, -1), ms(month)),
    }

def trend(p, g):
    b = TREND[g]
    return [{"start": b[i].strftime("%Y-%m-%d"), "count": count(p, b[i], ms(b[i + 1]))} for i in range(len(b) - 1)]

def total(p, edges): return count(p, edges[0], ms(edges[-1]))

out = {"asOf": now.isoformat(), "agencyCount": len(agencies), "scopes": {}, "byState": {}, "agencies": {}}
scopes = {"group": scope_pred()} | {s: scope_pred(state=s) for s in ["NSW","VIC","QLD","WA","SA","TAS","ACT","NT"]}
for name, p in scopes.items():
    out["scopes"][name] = {"kpi": kpis(p), "trend": {g: trend(p, g) for g in TREND}}
for g in TREND:
    out["byState"][g] = {s: total(scope_pred(state=s), TREND[g]) for s in ["NSW","VIC","QLD","WA","SA","TAS","ACT","NT"]}
for i, (n, s) in sorted(agencies.items(), key=lambda kv: kv[1][0]):
    p = scope_pred(agency=i)
    out["agencies"][i] = {"name": n, "state": s, "kpi": kpis(p),
        "range": {g: total(p, TREND[g]) for g in TREND}, "prev": {g: total(p, PREV[g]) for g in TREND},
        "trend": {g: trend(p, g) for g in TREND}}
print(json.dumps(out, indent=1))
