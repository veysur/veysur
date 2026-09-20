# Design token usage guide

How the shared `veysur-theme` semantic tokens are meant to be used. The values
themselves live in `src/tokens.css` and `src/brand.css`; this file explains the
**role** of each token so contributors pick the right one instead of reaching for a
raw palette colour or an opacity hack.

Scope: the shared tokens only. App-local tokens (`sidebar`, `chart`, `code`,
`alert-*`, `editor-active`) and the marketing vars (`hero-glow`, `highlights-*`)
are noted where relevant but documented in `AGENTS.md` and the consuming packages.

## Layering

Import order (see `AGENTS.md` for the rule):

1. `tailwindcss` (and `tw-animate-css` in the app).
2. `veysur-theme/palette.css` rewrites the entire Tailwind colour ramp
   (`--color-red-50` ... `--color-rose-950`) desaturated, via two knobs
   `--chroma-scale` (0.7) and `--brightness-scale` (0.9). Every `bg-red-500` etc.
   renders muted as a result.
3. `veysur-theme/brand.css` defines the brand primitives: `--brand-l`, `--brand-c`,
   `--brand-hue`, `--brand-primary`. The single place the brand colour is set.
4. `veysur-theme/tokens.css` holds the semantic tokens below. Each `--x` is mapped in
   an `@theme inline` block to `--color-x`, which is what makes `bg-x`, `text-x`,
   `border-x` exist as utilities.
5. `veysur-theme/base.css` provides the `*` / `html` / `body` reset.

**Dark mode** is a `.dark` class on `<html>`. Many dark values are not fresh
colours but the light value dimmed: `oklch(from <base> calc(l * var(--dim-brightness))
calc(c * var(--dim-brightness)) h)` with `--dim-brightness: 0.9`.

**`package/docsite` does not use `tokens.css`.** Starlight has its own token system;
`docsite/src/styles/custom.css` re-aliases a subset (`--background`, `--foreground`,
`--primary`, `--muted`, `--border`) onto Starlight `--sl-*` vars.

## Token reference

Each entry: the utilities it generates, what to use it for, what to avoid, and one
real example.

### `background` / `foreground`

- Utilities: `bg-background`, `text-foreground`.
- Use for: the page ground and default body text. `body` already sets both
  (`base.css`), so you rarely write them directly except on full-bleed overlays.
- Avoid: using `background` for panels that should sit above the page. That is
  `card`.

### `card` / `card-foreground`

- Utilities: `bg-card`, `text-card-foreground`.
- Use for: any raised content panel: cards, accordion items, articles, comparison
  tables, the legal-doc body. In `package/app` prefer the `<Card>`
  primitive (`src/component/shadcn/card.tsx:10`); `package/website` and
  `package/blogsite` apply the same class string by hand.
- `--header` and `--footer` (with their `-foreground` pairs) currently alias
  `--card`. Chrome uses `bg-header` / `bg-footer` so the two can diverge later
  without touching every header.
- Avoid: `bg-[var(--card)]` arbitrary values. Use `bg-card`.

### `popover` / `popover-foreground`

- Utilities: `bg-popover`, `text-popover-foreground`.
- Use for: floating panels only: popover, dropdown menu, select listbox, the TipTap
  bubble menu. Example `src/component/shadcn/popover.tsx`.
- Avoid: tooltips. The tooltip uses `primary` / `primary-foreground` on purpose.

### `primary` / `primary-foreground`

- Utilities: `bg-primary`, `text-primary`, `text-primary-foreground`,
  `border-primary`, `ring-primary`.
- Use for: the brand action colour. Primary buttons, active toggle segments, checked
  checkboxes / radios / switches, links (`text-primary`), text selection, the
  tooltip surface, spinners (`border-primary`), and the border on a selected or
  featured card.
- `--primary-base` is the undimmed brand value (`var(--brand-primary)`). `--primary`
  equals it in light mode and is dimmed in dark mode. Links and primary-text buttons
  opt back out of the dimming via
  `.dark a, .dark [data-slot='button'].text-primary { --primary: var(--primary-base) }`
  (`package/app/src/index.css:13`).
- Opacity idioms in use: `hover:bg-primary/90` (button hover), `bg-primary/5`
  (subtle featured-surface wash), `bg-primary/10` with `text-primary` (icon or
  avatar chip).
- Example `src/component/shadcn/button.tsx` `default` variant.

### `secondary` / `secondary-foreground`

- Utilities: `bg-secondary`, `text-secondary-foreground`.
- Use for: the "secondary button" fill and the neutral / secondary badge fill only
  (`src/component/shadcn/button.tsx:22`, `badge.tsx`). Also the inactive segment of
  a toggle in `package/app` (the website toggle uses `muted` instead, a known
  divergence).
- Avoid: using `secondary` as a panel background. That is `muted` or `card`.

### `muted` / `muted-foreground`

The most-used token. Two distinct jobs:

- `text-muted-foreground`: every piece of secondary text, labels, help text,
  placeholders (`placeholder:text-muted-foreground` in `input.tsx`), timestamps,
  disabled text, muted icons.
- `bg-muted`: subtle tracks and panels, the tab-list track
  (`src/component/shadcn/tabs.tsx:15`), progress track, avatar fallback, dropzones,
  code `<pre>` blocks, empty-state circles, blog tag pills.
- `bg-muted/40` to `bg-muted/70`: row hover states and selected list / table rows.
- `border-muted-foreground/30`: the border of an unchecked checkbox or radio.

### `accent` / `accent-foreground`

- Utilities: `bg-accent`, `text-accent-foreground`.
- Use for: the hover / focus background of ghost and outline buttons, dropdown /
  select / menu item hover, list-group hover and active row, calendar day states,
  editor toolbar toggles, the skeleton fill. `accent-foreground` is only ever paired
  with `bg-accent`.
- In practice this token is `package/app` only.
- Avoid: using `accent` as a static surface colour. It reads as an interaction
  state.

### `destructive` / `destructive-foreground`

- Utilities: `bg-destructive`, `text-destructive`, `border-destructive`,
  `ring-destructive`.
- Use for: destructive buttons (`variant="destructive"`), invalid-field ring and
  border (`aria-invalid:border-destructive`), error text, delete-confirm dialog
  actions, negative money amounts.
- `--destructive-base` is the light value; in dark mode `--destructive` switches to
  `var(--color-red-500)` from the desaturated palette.
- **`<Alert variant="destructive">` does not use this token.** Alert and toast
  colours are a separate red / green / amber / blue mix defined in
  `package/app/src/styles/alerts.css`.

### `success` / `success-foreground`

- Utilities: `bg-success`, `text-success`.
- Use for: positive confirmation accents: success check icons, "savings" badges and
  ribbons.
- `--success-base` is the light value; dark mode dims it via `--dim-brightness`.
- **There is no `success` Button or Badge variant.** Callers apply `bg-success` by
  hand. The token is under-adopted; much "success" UI still uses raw `green-*` (see
  the appendix).

### `border`

- Utilities: `border`, `border-border`, `divide-border`.
- Use for: hairline separators and outlines. Bare `border` (no colour) already
  resolves to `--border` because `base.css` sets `* { border-color: var(--border) }`.
  Write `border-border` explicitly only on elements outside that rule or for
  clarity in hand-rolled chrome.

### `input`

- Utilities: `border-input`, `bg-input`.
- Use for: form-control borders (`border border-input`). In dark mode also a
  translucent field fill (`dark:bg-input/23` to `/30`) and the "off" state of a switch
  track.
- Note: `--input` here is green-tinted (`oklch(0.62 0.08 155)`), not the neutral
  grey stock shadcn ships. Effectively `package/app` only.

### `ring`

- Utilities: `ring-ring`, `outline-ring`.
- Use for: the keyboard focus ring, nothing else. `--ring` is derived from
  `--primary` (`--ring-base` brightens and adds alpha).
- Two conventions coexist in the primitives: newer `ring-ring/50` + `ring-[3px]`
  (button, input) and older `ring-1 ring-ring`. Prefer the newer one for new work.

### `radius`

- Utilities: `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-xl`, all derived
  from `--radius` (`0.45rem`).

### `brand-gradient`

- Not a `--color-*` token. Consumed directly as `background: var(--brand-gradient)`
  (for example the website `.highlights-icon`). Has its own dark-mode definition.

## Choosing a token

| You want | Use |
|---|---|
| Default page text | `text-foreground` |
| Secondary / label / helper text | `text-muted-foreground` |
| A raised content panel | `bg-card` |
| A subtle inset panel or track | `bg-muted` |
| A floating menu / popover panel | `bg-popover` |
| Hover state on a menu or list item | `bg-accent` |
| Primary call to action | `bg-primary text-primary-foreground` |
| Secondary button | `variant="secondary"` (`bg-secondary`) |
| Destructive action | `variant="destructive"` / `text-destructive` |
| Positive confirmation accent | `text-success` / `bg-success` |
| Focus ring | `ring-ring` |
| Hairline / separator | `border` (inherits `--border`) |
| Invalid form field | `aria-invalid:border-destructive` |

## Featured and selected surfaces

There is no single "highlight" token. Pick by intent:

| Intent | Treatment |
|---|---|
| Solid featured card (whole card is the brand) | `bg-primary text-primary-foreground border-primary` |
| Emphasised or selected card, content unchanged | `border-primary` (optionally `+ bg-primary/5`, `+ shadow-md`), keep `bg-card` |
| Subtle wash on a featured row or column in a comparison table | `bg-primary/5` |
| Selected list or table row | `bg-muted` (align on `data-[state=selected]:bg-muted` from `src/component/shadcn/table.tsx`) |
| Active nav / menu / toolbar item | `bg-accent` (or `bg-sidebar-accent` inside the sidebar) |
| Active element in the survey editor | the `bg-editor-active` utility (`package/app/src/styles/tokens-app.css`) |

Current drift to be aware of: selected rows appear as `bg-muted`, `bg-muted/70` and
`bg-accent/30` in different components.

## Cross-package notes

- `package/website` and `package/blogsite` have no shadcn primitives. Reproduce
  surfaces with the plain utilities (`bg-card text-card-foreground rounded-xl border
  shadow-sm`), not `bg-[var(--card)]` arbitrary values.
- `destructive`, `success`, `accent`, `popover` and `input` are effectively
  `package/app` only. Website error, success and info UI currently uses raw
  `red-*` / `green-*` / `blue-*` because there is no website equivalent of
  `alerts.css` (known gap).
- `muted` / `muted-foreground` is the one token used consistently across all three
  packages.

## Appendix: known deviations (not yet fixed)

A checklist for follow-up cleanup tasks. None of these are addressed by this doc.

- `package/app/src/component/shadcn/progress.tsx:19` hard-codes `bg-lime-700`;
  should be `bg-primary`.
- Invalid `hsl(var(--token))` wrapping where the token is `oklch`:
  `package/app/src/styles/html-content.css:69` (`hsl(var(--muted))`) and
  `package/app/src/component/shadcn/sidebar.tsx:555` (`hsl(var(--sidebar-border))`,
  `hsl(var(--sidebar-accent))`). The declarations are silently dropped.
- `--field-error-bg` is defined only in `.dark` (`package/app/src/styles/alerts.css:98`);
  it has no light-mode value.
- Around seven delete-confirm dialogs hand-roll
  `className="bg-destructive text-white hover:bg-destructive/90"` instead of
  `variant="destructive"` (for example
  `appAdmin/component/SurveyPublication/PublicationDeleteDialog.tsx`).
- Roughly thirty raw `amber-*` / `green-*` / `red-*` status pills and
  `border-red-500` invalid-field borders that a `warning` / `success` token or the
  existing `alert-*` classes would cover.
- `--radius` is duplicated as a literal `0.45rem` in
  `package/docsite/src/styles/custom.css:45`; a theme radius change misses the docsite.
- Redundant identical `.dark` overrides for `--chart-3/4/5` and `--code-*` in
  `package/app/src/styles/tokens-app.css`.
- Two competing focus-ring conventions in the primitives (`ring-ring/50 ring-[3px]`
  vs `ring-1 ring-ring`).
