# Rayblue Agency Group Dashboard

An interactive prototype of the group-level dashboard for **Rayblue Agency Group**, an Australian real estate group that runs individual agencies in each state and territory.

## Product brief

### Problem

The group manager oversees many agencies across Australia but has no single place to see how rental activity is trending across the group.

### Users

| User | Needs |
| --- | --- |
| **Group manager** (primary) | A group-wide view of rental activity across every agency, with the option to narrow it down by state or by agency. |

### Scope of the prototype

- **App shell**: a left drawer sidebar with one navigation item, **Rental Analytics**.
- **Rental Analytics page**: basic analytics shown as charts:
  - Number of rental listings per **day**, **week** and **month** (one chart with a granularity switch).
  - Filters by **state** (NSW, VIC, QLD, WA, SA, TAS, ACT, NT) and by **agency**.
- **Data**: synthetic, seeded into a local SQLite file. No real customer data.

### Out of scope (for now)

- Authentication and roles
- Editing listings or agencies
- Live integrations with listing portals
- Analytics beyond listing counts (vacancy, rent prices, days on market)

### Domain glossary

| Term | Meaning |
| --- | --- |
| **Group** | Rayblue Agency Group, the parent organisation. |
| **State** | An Australian state or territory. Each agency belongs to exactly one. |
| **Agency** | An individual Rayblue office that manages rental properties. |
| **Listing** | A rental property advertised by an agency, counted on the date it was listed. |
| **Granularity** | The time bucket for a chart: daily, weekly (weeks start Monday) or monthly. |

All dates are bucketed in the `Australia/Sydney` timezone.

## Tech stack

| Concern | Choice |
| --- | --- |
| Runtime | Node.js 24, TypeScript (strict) |
| Framework | Next.js (latest) with the App Router |
| Database | SQLite (file-based) through Drizzle ORM |
| UI | Tailwind CSS, shadcn/ui, shadcn charts (Recharts) |
| Tests | Jest, React Testing Library, fast-check (property-based) |

## Getting started

Prerequisite: Node.js 24 (`nvm use` reads `.nvmrc`).

```bash
npm install
```

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run all Jest tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations to the SQLite file |
| `npm run db:seed` | Fill the database with synthetic agencies and listings |

## Documentation map

Read in this order; each step goes one level deeper.

1. **README.md** (this file): what the product is and how to run it.
2. **[AGENTS.md](AGENTS.md)**: the short rule set for anyone (human or AI agent) changing the code.
3. **[ENGINEERING.md](ENGINEERING.md)**: architecture, engineering decisions, practices and the testing strategy.
4. **[DESIGN.md](DESIGN.md)**: the UI design system (tokens, typography, layout, components, charts).
5. **`docs/`**: detailed, topic-specific notes and decision records, added as features grow.
