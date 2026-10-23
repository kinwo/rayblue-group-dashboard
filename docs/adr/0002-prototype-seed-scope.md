# 0002. Prototype seed: last 30 days, NSW/VIC/QLD, fictitious property managers

Status: accepted · 24 Oct 2026

## Context
intent.md originally asked for 24 months of data across all eight states and territories, and for no person names in the seed. For the prototype the product owner asked for a smaller dataset (last 30 days, NSW, VIC and QLD) and a data model whose `listings.propertyManager` column holds a person's name.

## Decision
- `npm run db:seed` generates 30 Sydney days of listings ending at the as-of time, for fictitious agencies in NSW, VIC and QLD only. It is deterministic for a given `SEED` and `SEED_AS_OF` (default 9:00 am, 24 Oct 2026 Sydney).
- `propertyManager` holds fictitious names. Like addresses and rents, it never leaves `src/data`: repository return types carry only ids, names of agencies, states and timestamps.
- The UI still shows all eight states and territories (others at 0), and the full Weekly and Monthly ranges (older buckets at 0).
- A `dataset_meta` table stores the as-of time that "today", "this week" and "this month" are relative to.

## Consequences
- intent.md §6, AC-DAT-3 and AC-PRV-3 were amended to match.
- Weekly and Monthly trends and "vs previous" are mostly 0 or "—" with this seed. A fuller seed can be added later without code changes outside `src/data/seed.ts`.
