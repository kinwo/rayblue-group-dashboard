# Design System

The visual language of the Rayblue Agency Group dashboard. It is **Cirrus**: a calm, data-dense admin style with a dark navy navigation chrome, light work surfaces and a single blue accent. The reference implementation is the HTML prototype at [`ui/webapp-html-prototype.html`](ui/webapp-html-prototype.html) (Rental analytics page, 1440 × 1240 canvas, light and dark).

This file is the single home for tokens, type, layout and component rules. Code reads values from CSS variables; never hard-code a hex, pixel size or shadow that a token already names.

## 1. Principles

1. **Numbers first.** The page exists to show listing counts. Figures get the strongest type, tabular numerals and right alignment; chrome stays quiet.
2. **One accent.** `--primary` blue marks the current selection, focus and the primary action. Everything else is ink, muted ink and lines.
3. **Semantic tokens only.** Components use role names (`--surface-raised`, `--ink-muted`), never palette names, so dark mode is a variable swap.
4. **Plain Australian English.** "State or territory", "Listing period", "New listings this week". Dates as `24 Oct 2026`, times as `9:00 am`, numbers via `toLocaleString('en-AU')`.
5. **Accessible by default.** WCAG 2.1 AA contrast, visible focus rings, keyboard reachable controls, charts with a text alternative.

## 2. Colour tokens

Defined once in `src/app/globals.css` on `:root`, overridden on `.dark` (the prototype's `.theme-dark`).

### Surfaces and ink

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--surface` | `#f4f7fa` | `#0a141c` | Page background |
| `--surface-raised` | `#ffffff` | `#111f2b` | Cards, tables, popovers, inputs |
| `--surface-sunken` | `#e9eff5` | `#0c1822` | Filter bar, table header, card footer, disabled fill |
| `--surface-hover` | `#eef5fa` | `#172838` | Row and item hover |
| `--selected` | `#e2f3fc` | `#0f2f45` | Selected row |
| `--line` | `#d6e0e9` | `#223647` | Borders, dividers, gridlines |
| `--line-strong` | `#71889b` | `#5f7d95` | Input and checkbox borders, chart axis baseline |
| `--ink` | `#0e2232` | `#e6eef5` | Primary text |
| `--ink-muted` | `#475d6e` | `#9cb1c2` | Secondary text, captions, table headers, axis labels |
| `--ink-disabled` | `#93a3b1` | `#556b7d` | Disabled text only (exempt from contrast) |
| `--overlay` | `#0614207a` | `#000000a8` | Dialog scrim |

### Accent and status

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--primary` | `#0a6aa1` | `#56c4f5` | Primary button, selected tab underline, checked controls, focus ring |
| `--primary-hover` / `--primary-pressed` | `#085a89` / `#064970` | `#86d5f8` / `#b0e4fb` | Button states |
| `--on-primary` | `#ffffff` | `#04202f` | Text on primary |
| `--sky` / `--sky-soft` / `--on-sky` | `#2bb0ed` / `#e2f3fc` / `#04263b` | `#38bdf8` / `#0f2f45` / `#04202f` | Brand highlight on chrome (current nav icon, nav badge), selected tab count |
| `--link` | `#0a6aa1` | `#56c4f5` | Inline links |
| `--info` / `--info-soft` | `#0a6aa1` / `#e2f3fc` | `#56c4f5` / `#0f2f45` | Info badge, alert, toast |
| `--success` / `--success-soft` | `#167445` / `#e3f4ea` | `#5bd394` / `#0e2d1f` | Positive state |
| `--warning` / `--warning-soft` | `#8a5000` / `#fdf0d5` | `#f4b740` / `#33250b` | Caution state |
| `--danger` / `--danger-soft` / `--danger-hover` / `--on-danger` | `#bd2a1c` / `#fde9e6` / `#9e2013` / `#ffffff` | `#ff8f80` / `#3b1613` / `#ffb0a6` / `#2b0904` | Errors, destructive actions |

Status colours always pair with an icon or text; colour is never the only signal.

### Chrome (side navigation)

| Token | Light | Dark |
| --- | --- | --- |
| `--chrome` | `#0c2638` | `#060f16` |
| `--chrome-raised` | `#173a52` | `#132535` |
| `--chrome-line` | `#24485f` | `#1b2e3e` |
| `--on-chrome` | `#e8f2f9` | `#e6eef5` |
| `--on-chrome-muted` | `#a3bccd` | `#93a9ba` |

The chrome is dark in both themes.

### Chart palette

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--chart-1` … `--chart-6` | `#1a8ad0` `#e2622b` `#cf4f93` `#7f8f14` `#6a55d8` `#0e9a8f` | `#2f9ee0` `#d95926` `#db5fa9` `#8d9c1e` `#8f82ea` `#13a093` | Categorical series, in this order |
| `--chart-other` | `#71889b` | `#5f7d95` | "Other" bucket |
| `--chart-seq-1` … `-5` | `#d6edfb` → `#0d568a` | `#143650` → `#a3d8f7` | Sequential (low → high), e.g. a state heat map |
| `--chart-div-1` … `-5` | `#d2551f` … `#1a7cbf` | `#f08a5d` … `#5cbcf2` | Diverging around `-3` (neutral), e.g. change vs previous |

A single-series chart uses `--chart-1`. Assign series colours from a fixed key (state id, agency id), not render order, so a state keeps its colour across filters. The mapping lives in one helper in `src/utils` (AGENTS.md rule 1).

### Checked contrast (light theme)

`--ink` on `--surface` 15.1:1 · `--ink-muted` on `--surface-raised` 6.9:1, on `--surface-sunken` 5.9:1 · `--on-primary` on `--primary` 5.9:1 · status text on its soft fill ≥ 5.1:1 · `--on-chrome-muted` on `--chrome` 7.9:1 · `--line-strong` and `--chart-1` on white ≥ 3.7:1 (meets the 3:1 non-text rule). Re-check when adding a pair.

## 3. Typography

Fonts: **Public Sans** (400, 500, 600, 700) for UI, **JetBrains Mono** (400) for code and IDs. Load with `next/font` (self-hosted, `display: swap`); fall back to the system UI stack.

| Class | Size / line | Weight | Extra | Use |
| --- | --- | --- | --- | --- |
| `text-display` | 28 / 36 | 600 | −0.01em | KPI values |
| `text-title` | 22 / 28 | 600 | −0.005em | Page title |
| `text-heading` | 17 / 24 | 600 | | Card and section titles |
| `text-subheading` | 14 / 20 | 600 | | Sub-section titles |
| `text-body-lg` | 16 / 24 | 400 | | Rare long-form text |
| `text-body` | 14 / 20 | 400 | | Default body, table cells |
| `text-label` | 14 / 20 | 500 | | Form labels, buttons, tabs, nav items |
| `text-caption` | 12 / 16 | 400 | | Meta lines, notes, axis labels |
| `text-caption-strong` | 12 / 16 | 600 | | KPI labels, bar values, tooltip titles |
| `text-overline` | 11 / 16 | 600 | 0.06em, uppercase | Nav section labels |
| `text-code` | 13 / 20 | 400 mono | | IDs, code |

Rules: base size is 14px (dense admin UI). Every figure that can line up with another uses `font-variant-numeric: tabular-nums` (`tabular-nums` in Tailwind). Sentence case everywhere except overlines. Use `−` (U+2212) for negative changes, as the prototype does.

## 4. Spacing, size, shape, depth

**Spacing** (4px base): `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-8` 32 · `-12` 48. Use only these steps.

**Control heights:** `--control-sm` 28 · `--control-md` 36 (default) · `--control-lg` 44 (touch-first).
**Table rows:** `--row-compact` 32 · `--row-default` 40 · `--row-comfortable` 48.

**Radius:** `--radius-sm` 4 (badges, checkboxes, tab counts) · `--radius-md` 6 (buttons, inputs, menus, nav items, tooltips) · `--radius-lg` 10 (cards, tables, alerts, dialogs, filter bar) · `--radius-full` (switches, dots, spinners).

**Shadow:** `--shadow-sm` (sticky header, switch thumb) · `--shadow-md` (popovers, tooltips, toasts) · `--shadow-lg` (dialogs). Cards and tables sit flat with a 1px `--line` border, no shadow.

**Z-index:** `--z-sticky` 100 · `--z-dropdown` 1000 · `--z-dialog` 1300 · `--z-toast` 1400.

**Motion:** 120ms ease-out for colour and border changes, 150ms for switches, 160ms for toast entry. Respect `prefers-reduced-motion` (drop transitions, slow spinners to 2s).

## 5. Layout

```
┌──────────────┬──────────────────────────────────────────────┐
│ SideNav      │ PageHeader  (title · meta line · actions)    │
│ 248px        ├──────────────────────────────────────────────┤
│ --chrome     │ Filter bar  (state Select · period Tabs ·    │
│              │              spacer · Export CSV)            │
│              │ KPI row     (4 cards, flex 1 1 220px)        │
│              │ Trend card  (line chart, full width)         │
│              │ ┌ By-state card ─┐ ┌ Top agencies table ───┐ │
│              │ │ flex 1 1 380px │ │ flex 1.4 1 480px      │ │
│              │ └────────────────┘ └───────────────────────┘ │
└──────────────┴──────────────────────────────────────────────┘
```

- **Shell:** side nav `--sidenav-width` (248px) on `--chrome`, main column on `--surface`. Below ~808px the nav wraps above the content; in the app use the shadcn Sidebar's sheet on mobile.
- **Content:** padding `20px 24px 32px`, max width 1360px, vertical gap `--space-6` (24px) between blocks.
- **Responsive by flex-wrap**, not breakpoints: each row uses `flex-wrap` with flex-basis minimums (KPI 220px, by-state 380px, table 480px). Tables scroll horizontally inside their frame rather than squash.
- **Filter bar:** `--surface-sunken` panel, `--radius-lg`, padding `12px 16px`, gap 16px, items aligned to the bottom edge. Filters reflect URL search params (AGENTS.md rule 4).

## 6. Components

Build on shadcn/ui primitives in `src/components/ui`, themed through the tokens above. Feature components in `src/components` compose them. Names in brackets are the prototype's Cirrus classes.

### Buttons (`ci-btn`)

| Variant | Fill / text / border | Use |
| --- | --- | --- |
| Primary | `--primary` / `--on-primary` | One per view, the main action |
| Secondary | `--surface-raised` / `--ink` / `--line-strong` | Supporting actions (Export CSV) |
| Ghost | transparent / `--ink` | Toolbar and icon buttons |
| Danger | `--danger` / `--on-danger` | Destructive confirmation |

Sizes sm / md / lg map to control heights; padding 12 / 16 / 20px; gap 8px (4px at sm). Icon-only buttons are square and need an `aria-label`. Hover uses `*-hover` or `--surface-hover`; disabled is `--surface-sunken` + `--ink-disabled`; busy sets `aria-busy="true"` with a spinner.

### Form controls (`ci-input`, `ci-field`, `ci-check`, `ci-radio`, `ci-switch`)

- Field = label (`text-label`) above control, 4px gap, optional helper or error message (`text-caption`) below. Errors use `--danger` text plus an icon.
- Inputs and selects: `--surface-raised`, 1px `--line-strong` border, `--radius-md`. Hover border `--ink-muted`; focus border `--primary` plus focus ring; invalid border `--danger`.
- Checkbox 16px (`--radius-sm`), radio 16px round, switch 32 × 18px track. Checked state fills `--primary`.
- Always a visible label; placeholder is never the label.

### Tabs (`ci-tab`) — used for the Daily / Weekly / Monthly period switch

40px tall, 16px gap, `text-label`, `--ink-muted` text, `--ink` when hovered or selected. The selected tab gets a 2px `--primary` underline overlapping the 1px `--line` bottom border. Optional count pill: `--surface-sunken` (selected `--sky-soft` / `--primary`). Wire `role="tab"` / `tabpanel` with matching ids.

### Card (`ci-card`)

`--surface-raised`, 1px `--line`, `--radius-lg`, no shadow. Head padding `16px 16px 0` with `text-heading` title and `text-caption` `--ink-muted` description; body padding 16px; optional footer on `--surface-sunken` with a top border.

### KPI tile

A card-styled block: `text-caption-strong` muted label → `text-display` tabular value → `text-caption` muted note that gives the comparison ("Week to date · last week 3,369"). Four in a row; never colour the value.

### Data table (`ci-table`)

Framed like a card (`--line` border, `--radius-lg`, overflow hidden). Header row on `--surface-sunken`, `--ink-muted` text. Rows `--row-default` (40px) with 12px cell padding and a 1px `--line` divider; hover `--surface-hover`, selected `--selected`. Numeric columns right-aligned and tabular, with sort icons on the left of the header text. Sortable headers are buttons; the sorted column's icon turns `--primary`. Empty state: centred `--ink-muted` text with 48px vertical padding. Give the table a `<caption>` (can be visually hidden).

### Side navigation (`ci-sidenav`)

On `--chrome`. Head: product name (`--on-chrome`) and context line ("Group office · All states", `--on-chrome-muted`). Section label in `text-overline`. Items 36px tall, `--radius-md`, icon in `--on-chrome-muted`; hover and current use `--chrome-raised`, current is weight 600 with a `--sky` icon and `aria-current="page"`. Footer shows the signed-in role. Focus uses `--focus-ring-chrome`.

### Page header (`ci-pagehead`)

`--surface-raised` band with a bottom `--line`, padding `20px 24px 16px`. Optional breadcrumbs, `text-title` h1, `text-caption` meta line (scope · data note · "Updated 9:00 am, 24 Oct 2026"), actions on the right.

### Feedback

- **Badge** (`ci-badge`): 20px tall, `--radius-sm`, soft fill + strong text per status; neutral uses `--surface-sunken` with an inset `--line`.
- **Alert** (`ci-alert`): soft fill, `--radius-lg`, status icon, title + text, optional actions.
- **Toast** (`ci-toast`): 360px, `--surface-raised`, `--shadow-md`, bottom-right, 24px from the edges.
- **Dialog** (`ci-dialog`): sm 400 / md 520 / lg 720px, `--shadow-lg`, footer actions right-aligned, scrim `--overlay`.
- **Popover / menu / listbox** (`ci-popover`, `ci-option`): `--surface-raised`, `--radius-md`, `--shadow-md`, options 32px min height, active `--surface-hover`.

## 7. Charts

Built with shadcn charts (Recharts), coloured from the chart tokens.

- **Trend line** (listings per day / week / month): 240px plot, single 2px `--chart-1` line, 7px points (10px when hovered) ringed with 2px `--surface-raised`. Five horizontal gridlines in `--line`, baseline in `--line-strong`; y-axis labels on the left in `text-caption` muted, tabular, "nice" rounded maxima. Label every second x tick, counting back from the latest so the latest is always labelled.
- **Hover:** dashed `--line-strong` crosshair plus a tooltip card (`--surface-raised`, `--line` border, `--radius-md`, `--shadow-md`, min width 140px): long date in `text-caption-strong`, then swatch · series name · bold tabular value. Flip the tooltip to the left of the crosshair past 70% of the width.
- **Horizontal bars** (listings by state): grid of `112px · 1fr · 64px` (state id with agency count / bar / value), 18px bars in `--chart-1` with `0 4px 4px 0` radius from a `--line-strong` baseline. Sort descending. When a state filter is active, keep all bars and fade the others to 35% opacity.
- **Legend:** 10px rounded-square swatch + `text-caption` muted name above the plot.
- **Partial periods** are labelled "(to date)" in tooltips and KPI notes, never silently compared with full periods.
- **Accessibility:** wrap the chart in `role="img"` with an `aria-label` summarising scope, range, latest and peak values ("New listings per day for All states and territories, 11 Oct to 24 Oct. Latest 258, peak 621."). Decorative SVG gets `aria-hidden`.

## 8. Accessibility

- **Focus:** `--focus-ring` (2px surface gap + 2px `--primary`) on every interactive element via `:focus-visible`; `--focus-ring-chrome` inside the nav. Under `forced-colors: active`, fall back to a 2px `Highlight` outline.
- **Targets:** minimum 28px (sm), 36px default; prefer lg (44px) for touch-only views.
- **Semantics:** landmarks (`nav`, `main`, labelled `section`s), one `h1` per page, `aria-current` on the active nav item, `aria-live` for toasts.
- **Language:** `<html lang="en-AU">`.
- Visually hidden text uses the `sr-only` utility (`ci-visually-hidden`).

## 9. Dark mode

Toggle by adding `.dark` to `<html>` (shadcn convention; the prototype uses `.theme-dark`). Only token values change. In dark mode `--primary` becomes a light sky blue with dark `--on-primary` text, shadows deepen to near-black, and sequential chart ramps invert so "more" stays more prominent.

## 10. Mapping to Tailwind and shadcn/ui

Keep the Cirrus names above as the source of truth in `src/app/globals.css`, then alias shadcn's variables to them so stock components pick up the theme without edits (AGENTS.md rule 7):

| shadcn variable | Cirrus token |
| --- | --- |
| `--background` / `--foreground` | `--surface` / `--ink` |
| `--card`, `--popover` (+ `-foreground`) | `--surface-raised` / `--ink` |
| `--primary` / `--primary-foreground` | `--primary` / `--on-primary` |
| `--secondary`, `--muted` | `--surface-sunken` |
| `--muted-foreground` | `--ink-muted` |
| `--accent` / `--accent-foreground` | `--surface-hover` / `--ink` |
| `--destructive` | `--danger` |
| `--border` | `--line` |
| `--input` | `--line-strong` |
| `--ring` | `--primary` |
| `--radius` | `--radius-md` (6px) |
| `--chart-1` … `--chart-5` | `--chart-1` … `--chart-5` |
| `--sidebar` / `--sidebar-foreground` | `--chrome` / `--on-chrome` |
| `--sidebar-accent` / `--sidebar-border` / `--sidebar-ring` | `--chrome-raised` / `--chrome-line` / `--sky` |

shadcn's `--primary` collides by name with Cirrus `--primary`; they hold the same value, so define it once. Expose the remaining Cirrus tokens to Tailwind through `@theme inline` (e.g. `bg-surface-sunken`, `text-ink-muted`, `border-line`, `rounded-lg` = 10px) and register the type scale as utilities (`text-display`, `text-caption-strong`, …) so components never use arbitrary values like `text-[28px]` or `bg-[#e9eff5]`.

## 11. Changing the system

1. Change the token in `globals.css` (both themes) and update the tables here in the same commit.
2. Re-check contrast for any new text/background pair (AA: 4.5:1 text, 3:1 large text and UI parts).
3. Update the prototype only if the change is a deliberate redesign; otherwise the code is the reference.
4. A new component pattern gets a short section in §6 before it is reused a second time.
