# Agentic Workflow

How the Rayblue Group Dashboard v1 was produced with AI agents, from design prototype to an open pull request ([kinwo/rayblue-group-dashboard#1](https://github.com/kinwo/rayblue-group-dashboard/pull/1)).

## 1. Workflow overview

Each step ran in its own session, so every session started from documents rather than a long chat history:

1. **Design.** In Claude Design, create an interactive Rayblue Group Dashboard web UI. Export it as a single-page interactive HTML file ([ui/webapp-html-prototype.html](../ui/webapp-html-prototype.html)).
2. **Agent docs.** In Claude Code, create the agent-facing markdown files (AGENTS.md, ENGINEERING.md, DESIGN.md for UI/UX, README.md) using the Progressive Disclosure Principle. They cover engineering principles, the tech stack, unit tests, component tests and property-based tests. AGENTS.md stays short and points to the deeper docs.
3. **Requirements.** In a separate Claude Code session, create [intent.md](../intent.md) from the product brief: acceptance criteria with stable IDs (AC-NAV-1 …) and a verification method for each.
4. **Plan.** In a separate Claude Code session, create the implementation plan from intent.md, the HTML prototype, the data model schema and the synthetic-data brief, using a Claude Agent Team with three teammates (Sam, Tim, Albert).
5. **Build.** Execute the implementation plan with the agent team (§3).
6. **E2E plan.** In a separate Claude Code session, create the E2E test plan [e2e-test-plan.md](../e2e-test-plan.md) from intent.md.
7. **Manual check.** When the implementation is complete, run the app by hand, do sanity tests and steer the app (production build check: see [verify.md](verify.md)).
8. **E2E run.** Execute the E2E test plan in a separate Claude Code session: auto-fix any issues found, take screenshots as proof, and record the results in `e2e-test-results.md`.

## 2. AI agent tools used

| Tool                                                                                               | Used for                                                                                                                         |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Design**                                                                                  | The interactive HTML prototype, which became the visual reference for DESIGN.md                                                  |
| **Claude Code (desktop app, Opus 5.5)**                                                            | Docs, the requirements, planning, implementation, review, merging, the PR and these evidence files                               |
| **Plan mode**                                                                                      | Read-only exploration of the docs, then a written plan approved before any code changed                                          |
| **Claude Agent Teams** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.local.json`) | A lead plus three named teammates working in parallel                                                                            |
| **Agent tool with `isolation: "worktree"`**                                                        | One git worktree and branch per teammate (`team/sam`, `team/tim`, `team/albert`), so parallel commits never clobbered each other |
| **Claude Code PR Auto-fix**                                                                        | The desktop app watches PR #1 for CI failures, conflicts and review comments                                                     |
| **GitHub Actions and GitGuardian**                                                                 | The independent pipeline check and secret scanning on the PR                                                                     |

## 3. How the work was decomposed

**Phase 0, lead, sequential, one commit** (`7f11c2a chore: scaffold app and layer contracts`):

- Scaffolded Next.js 16.4 on Node 24 and installed every dependency up front, so `package.json` and the lockfile would not conflict across branches.
- Added the shadcn primitives, Jest (node and jsdom projects), and ESLint layering rules.
- Committed the **shared contracts** that let three agents work in parallel without waiting: `ListingRepository`, `RentalAnalyticsView`, the typed errors, states and granularity.

**Phase 1, the agent team in parallel**, split by architectural layer, each with exclusive file ownership:

| Teammate                   | Owned                                                                                                | Subtasks (one commit each)                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sam**, data and platform | `src/data`, `src/clients`, `instrumentation.ts`, `src/app/api`, `proxy.ts`, `next.config.ts`, logger | Schema and migration → deterministic seed → read-only client, repository and in-memory test DB → logger and start-up checks → health and API 404/405 → CSP and security headers |
| **Tim**, domain logic      | `src/utils`, `src/services`, `src/test/arbitraries.ts`                                               | Sydney date bucketing with property tests → formatting → search-param parsing → the rental-analytics service                                                                    |
| **Albert**, UI             | `src/app` pages and layout, `src/components`                                                         | Tokens and fonts → app shell → URL filters → KPI tiles, chart, bars and table → header and error, loading and not-found states → page wiring                                    |

**Dependency hand-offs inside the team**, announced by message rather than by polling:

- Sam's in-memory test DB unblocked Tim's service tests. Tim merged `team/sam` when Sam said it had landed.
- Tim's service unblocked Albert's page wiring. Albert merged `team/tim` twice: utils first, then the service.
- Until those landed, each teammate built against the Phase 0 contracts and fixture objects.

**Phase 2, the lead:**

- Reviewed each branch and merged `team/sam`, then `team/tim`, then `team/albert` into `feat/rental-analytics-v1`, re-running lint, typecheck and tests after each merge.
- Updated intent.md, ENGINEERING.md, the ADRs, the runbook and CI in parallel with the team, in files no teammate owned.

**Result:**

- 26 non-merge commits since `main`, from the lead, the three teammates and one from the user (enabling Agent Teams).
- 275 tests in 33 suites, all passing.
- CI green on PR #1.

## 4. Representative steering prompts and instructions

**From the user:**

- The original brief, abridged: "implement with intent.md · generate sample synthetic data … last 30 days across NSW, VIC and QLD · implement with agent team with 3 teammates: Sam, Tim and Albert, agent teammates should commit to git when it finishes a subtask · include safety and failure paths e.g. database outage, API endpoint not available", plus the Listing/Agency data model.
- On the plan: "Update to ensure it uses Claude Agent Team". The plan was rewritten around named teammates, SendMessage and worktrees.
- Mid-build: "Estimate the completion time" and "What are the remaining tasks?". These were answered from commit timestamps on each branch, not guesses.
- Scope cuts: "Drop the integration test. It is out of scope." and "I will check the production builds myself."

**From the lead to the teammates.** A shared team brief, plus one task list per teammate. Excerpts:

- _Shared rules:_ "Touch only the files you own … Need something elsewhere? Message the owner." "Changing a contract file: message the lead and every affected teammate **before** committing it." "Commit after every numbered subtask … after `npm run lint && npm run typecheck && npm test` passes."
- _Grounding:_ "This is Next.js 16.4 with `cacheComponents: true` … read the relevant guide in `node_modules/next/dist/docs/` before using any Next API."
- _Decisions fixed up front:_ "Decisions already made (do not re-litigate)": seed scope, fictitious property-manager names, `ListingStatus`, `dataset_meta`, the layering and the shared export names.
- _Failure paths as a requirement:_ "Database outage, missing/corrupt DB file, locked DB, endpoint not available, invalid input, stale data, empty data. Each must degrade to a safe, plain message or HTTP status, be logged as one structured JSON line, and never leak stack traces, SQL, file paths or env values. Test each one."
- _Hand-off instruction, to Sam:_ "**tim needs this for his service tests: message tim the moment this commit lands**."
- _Cross-team negotiation, to Sam:_ "**Ask albert** whether Recharts/shadcn need inline `style` attributes and agree on `style-src`."

## 5. Where humans and the lead intervened

**The user's decisions**, asked with AskUserQuestion because the brief conflicted with intent.md:

1. **Seed scope:** the brief said 30 days for NSW, VIC and QLD; intent.md said 24 months for all eight states. Decision: 30 days, NSW/VIC/QLD, and amend intent.md (ADR 0002).
2. **`propertyManager`:** the column holds a person's name, but AC-PRV-3 said the seed generates no names of people. Decision: fictitious names, which never leave `src/data`.
3. **Git flow:** decision: one worktree per teammate, merged by the lead.
4. **Use the Claude Agent Teams feature** explicitly. The plan was revised before approval.
5. **Cut scope:** the lead's integration-test suite was dropped before it ever ran or was committed, and the user took over production-build verification.

## 6. How generated output was reviewed

**Gates:**

- **Every commit:** each teammate ran `npm run lint && npm run typecheck && npm test` before committing. The brief required it.
- **Every merge:** the lead re-ran lint, typecheck and the full suite on `feat/rental-analytics-v1` after each merge (177 tests after Sam and Tim, 275 after Albert).

**Reading the code:** the lead read the critical paths rather than trusting the reports. For example, it read `rental-analytics.ts` to confirm there is one bounded read, that errors propagate, and that the AC-FLT-9 agency drop is in place. It also read Albert's `error.tsx`, `retry-error-view.tsx` and `not-found.tsx` to confirm the error object is never rendered.

**Reports treated as claims, not proof:** the teammates' final reports listed their judgement calls, and each was accepted or questioned explicitly. Accepted examples:

- Listings after the as-of time never count.
- Top 8 may include agencies with 0 listings.
- `retry()` instead of `reset()`.
- `style-src-attr 'unsafe-inline'`.

**Mechanical checks:**

- The ESLint layering rules were tested by piping a forbidden import through `eslint --stdin` before the team started.
- `fc.assert` appears 28 times across 10 test files: date buckets, aggregation, search params, formatting, seed, chart colours, filters, bars and trend chart.

**Independent checks:**

- GitHub Actions on PR #1: lint, typecheck, tests with coverage, migrate and seed, production build and `npm audit --omit=dev --audit-level=high` all passed.
- GitGuardian passed.

**What still needs a human:** see [verify.md](verify.md) for the production-build browser check, accessibility and performance.

## 7. Lessons

- **Contracts before parallelism.** Committing the types and the test-DB helper names first meant three agents could start at once and merge with no conflicts.
- **Ground agents in installed docs.** Next 16.4's `cacheComponents` default, `proxy.ts`, `retry()` and the CSP and PPR incompatibility all differ from training data. Pointing agents at `node_modules/next/dist/docs/` caught them.
- **Exclusive file ownership plus "ask the owner"** turned what would have been merge conflicts into short negotiations: the CSP `style-src`, `cn`, the sidebar cookie and chart colours.
- **Production builds find what unit tests can't.** The CSP and hydration blocker was invisible in Jest and in `next dev`.

## Apendix:

## Product Intent Prompt

```
Create an interactive prototype for Australia “Rayblue Agency Group" dashboard

- Overseeing all the individual agencies in each states
- It has a left drawer side bar with 1 item: Rental Analytics
- Group manager can see basic analytics in diagrams:
  - Number of listings on daily, weekly and monthly
- Real estate is a regulated industry.
- Deployment reliability, security and enterprise quality are high priority.
```

## Implementation Plan Prompt

```
# Implementation
- implement with intent.md
- generate sample synthetic data dataset for the last 30 days across NSW, VIC and QLD states
- implement with agent team with 3 teammates: Sam, Tim and Albert, agent teammates should commit to git when it finishes a subtask
- include safety and failure paths e.g database outage, API endpoint not available

# Data Model Schema

- Tables: Listing, Agency
- Listing: id, subNumber, streetNumber, street, suburb, postcode, state, propertyType, beds, baths, rentPerWeek, propertyManager, status, listedDate, createdAt, updatedAt
- Enum: ListingStatus
```
