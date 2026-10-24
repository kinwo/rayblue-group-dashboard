# AGENTS.md

Instructions for AI coding agents (and humans) working in this repo. Keep this file short; it points to deeper docs instead of repeating them.

## What this is

Next.js prototype of the **Rayblue Agency Group** dashboard: a group manager views rental listing counts (daily, weekly, monthly) across agencies in every Australian state. Product brief: [README.md](README.md).

## Stack

Node.js 24 · TypeScript (strict) · Next.js App Router (latest) · Drizzle ORM · SQLite file · Tailwind CSS · shadcn/ui · rate-limiter-flexible · Jest · React Testing Library · fast-check

## Commands

```bash
npm run dev          # dev server on :3000
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # all tests
npm run db:migrate   # apply migrations
npm run db:seed      # synthetic data
```

Done means `npm run lint && npm run typecheck && npm test` passes.

## Where code goes

| Folder | Holds | May import |
| --- | --- | --- |
| `src/app` | Routes, layouts; thin | components, services, utils |
| `src/components` | React UI (`ui/` = shadcn) | utils |
| `src/services` | Business logic, no React/Next | data, utils |
| `src/data` | Drizzle schema, migrations, repositories, seed | clients, utils |
| `src/clients` | DB client and other configured clients | (external packages) |
| `src/utils` | Pure helpers and constants | nothing in the project |
| `docs` | Topic notes, ADRs | — |

Never import upward. Use the `@/` alias.

## Rules

1. Clean Code and DRY: one home for each piece of knowledge (states, date bucketing, chart colours). Search before you add a helper.
2. Server Components by default; `"use client"` only when needed.
3. Dates stored in UTC, bucketed in `Australia/Sydney`, via the single helper in `src/utils`. Inject "now"; don't call `new Date()` in logic.
4. Filters and granularity live in URL search params, validated at the page.
5. Every change ships with tests next to the code (`*.test.ts(x)`). Use fast-check for date/aggregation logic; RTL by role/label for components; in-memory SQLite, not mocks, for data.
6. Schema change → `npm run db:generate` → commit the migration with it.
7. Don't edit `src/components/ui/*` unless the change must apply everywhere.
8. No new dependencies without a clear reason; record big decisions as an ADR in `docs/adr/`.

## Read more only when you need it

| If you are… | Read |
| --- | --- |
| Unsure about product scope or terms | [README.md › Product brief](README.md#product-brief) |
| Building or checking a feature against requirements | [intent.md](intent.md) (acceptance criteria) |
| Adding a feature or a new layer file | [ENGINEERING.md › Architecture](ENGINEERING.md#3-architecture) |
| Choosing a library or pattern | [ENGINEERING.md › Tech stack decisions](ENGINEERING.md#2-tech-stack-decisions) |
| Building or styling UI (tokens, components, charts) | [DESIGN.md](DESIGN.md) |
| Writing tests or property tests | [ENGINEERING.md › Testing strategy](ENGINEERING.md#5-testing-strategy) |
| Working on a specific topic | `docs/` (topic notes and ADRs) |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
