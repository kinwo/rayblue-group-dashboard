# Runbook: Rayblue Agency Group dashboard

Operational notes for v1 (AC-REL-6). The app is hosting-agnostic: any host that runs Node.js 24 and serves one process behind HTTPS.

## Build a release

```bash
npm ci
```

```bash
npm run lint && npm run typecheck && npm test
```

```bash
npm run db:migrate && npm run db:seed && npm run build
```

A release is the immutable bundle of `.next/`, `node_modules/`, `package.json`, `public/` and the seeded `data/rayblue.db`, tagged with the version in `APP_VERSION` (for example the git tag `v1.0.0`). Never rebuild a release in place.

## Configuration

Environment variables are documented in `.env.example` and validated at start-up. A missing or invalid value, a missing database file, or a database on a different migration than the code expects makes the process exit non-zero with one JSON log line. Fix the cause; do not retry in a loop.

## Deploy

1. Upload the new release next to the current one (for example `releases/v1.0.1/`).
2. Point the `current` symlink (or the host's active release) at it and restart the process: `npm start`.
3. Check health (below). If it fails, roll back.

## Check health

```bash
curl -fsS https://<host>/api/health
```

Expect HTTP 200 with `{"status":"ok","version":"<release>","database":"ok"}`. HTTP 503 with `"database":"unavailable"` means the process is up but cannot read the database file.

## Roll back (one step)

Point `current` back at the previous release directory and restart. Releases ship their own database, so code and data roll back together.

## Incidents

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Process exits at start with `startup_check_failed` | Env invalid, DB file missing, or migration mismatch | Read the one log line, fix config or redeploy the release with its DB |
| Page shows "We can't load the figures right now", health 503 | DB file removed, unreadable, locked or corrupt | Restore the release's `data/rayblue.db` (or roll back); users press Retry |
| Page shows "figures may be out of date" | Dataset as-of time is over 24 hours old | Build and deploy a release with a fresh seed |
| 404 JSON under `/api/*` | Unknown endpoint; only `/api/health` exists | Expected |

Logs are one JSON object per line on stdout (time, level, route, status, duration). They contain no request bodies, cookies or personal data. Retention is decided once a host is chosen (intent §9).

## Host-level protection the app relies on

The app has no rate limiting or firewall of its own. The host or a reverse proxy in front of it must:

- terminate TLS and redirect HTTP to HTTPS (HSTS is sent by the app);
- rate-limit per client IP (suggested 60 requests per minute for pages, 10 per minute for `/api/health` from outside the monitoring network);
- allow only `GET` and `HEAD` from the internet;
- cap request header and URL size (for example 16 KB).
