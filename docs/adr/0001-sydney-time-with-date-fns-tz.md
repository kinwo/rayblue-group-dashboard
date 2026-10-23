# 0001. Sydney date bucketing with date-fns and @date-fns/tz

Status: accepted · 24 Oct 2026

## Context
Every figure is bucketed by day, Monday-start week or month in `Australia/Sydney` (AGENTS.md rule 3). Doing this with raw `Intl` arithmetic is error-prone across DST changes (first Sunday of October and April), where a Sydney day is 23 or 25 hours long. Node 24 does not ship `Temporal` unflagged.

## Decision
Use `date-fns` v4 with `@date-fns/tz` (`TZDate`) inside the single helper `src/utils/date-buckets.ts`. All other code passes UTC epoch milliseconds and calls that helper or `src/utils/format.ts`.

## Consequences
- Two small, tree-shakeable dependencies; no global timezone state.
- DST and month-end behaviour is covered by fast-check properties in `date-buckets.test.ts`.
- Revisit when `Temporal` is available without a flag.
