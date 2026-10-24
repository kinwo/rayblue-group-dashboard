# 0005. Component styles in CSS modules, composed from Tailwind tokens

Status: accepted · 24 Oct 2026

## Context
Feature components carried long Tailwind `className` strings (up to about 200 characters, plus `cn()` merges to override shadcn defaults). Markup and styling were mixed, the same layout knowledge (card flex sizes, the KPI row) was repeated in the page, the components and the loading skeleton, and nothing said what an element *is*.

## Decision
- Every component under `src/components` (except the generated `ui/`) and every route under `src/app` keeps its styles in a sibling `*.module.css` with semantic class names (`.tile`, `.value`, `.trigger`). The TSX passes `styles.name`; state goes through `data-*` attributes (`data-faded`, `data-checked`, `data-active`) rather than conditional utility strings.
- Module rules are written with `@apply` and the existing token utilities, after `@reference "…/app/globals.css"`. Tokens, the type scale and the `md` breakpoint stay in one place (DESIGN.md §10), and DESIGN.md's rule against arbitrary hex and pixel values still applies.
- Layout shared by several components lives in one module (`analytics-layout.module.css`, with `CardRow`) instead of being repeated.
- Module rules are unlayered, so they beat the shadcn primitives' layered utilities without `cn()` merging or `dark:` overrides.
- `next.config.ts` runs the Tailwind Turbopack loader on module files with `as: "*.module.css"`, so Next still treats them as CSS modules.
- ESLint (`no-restricted-syntax` in `eslint.config.mjs`) rejects string literals in `className`, in `className` template literals and inside `cn()` in those folders. The one allowed literal is `className="sr-only"`.

## Consequences
- Rendering is unchanged. Computed styles were compared element by element before and after (desktop light and dark, mobile, the open select and combobox, the 404 page) with no differences. Two overrides that had never taken effect were dropped rather than suddenly applied: `border-r-0` on the sidebar and `after:bottom-[-1px]` on the period tabs.
- Component tests assert module class names (`styles.value`) or `data-*` attributes, not utility classes. Jest maps each module class to its own name.
- Unlayered module rules also beat Tailwind utilities passed in by a parent. Pass sizing through a module class (`layout.stateColumn`), not utility strings.
- Styling a feature component means editing two files, not one.
