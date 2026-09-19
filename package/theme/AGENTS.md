# AGENTS.md — veysur-theme

Shared CSS design token package. A single source of truth for shadcn/Tailwind colour tokens, the brand colour, and the base/reset layer used by `package/app`, `package/website`, and `package/blogsite`.

**Not a Node.js package** — no build step, no TypeScript, no `node_modules` build output. The CSS source is exported directly.

## What lives here

`src/brand.css` contains the canonical brand-colour primitives (`--brand-l`, `--brand-c`, `--brand-hue`, `--brand-primary`). It is imported by `tokens.css` and, separately, by `package/docsite`.

`src/tokens.css` contains all CSS custom properties shared between app, website, and blog:

- Core: `--dim-brightness`, `--radius`
- Colours: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`
- Chrome surfaces: `--header`, `--header-foreground`, `--footer`, `--footer-foreground` (both default to `--card`) — the page header and footer bar in app and website
- Brand: `--primary-base`, `--primary`, `--primary-foreground-base`, `--primary-foreground`, `--primary`, `--brand-gradient`
- Palette: `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`
- Semantic: `--destructive-base`, `--destructive`, `--destructive-foreground`, `--success-base`, `--success`, `--success-foreground`
- Chrome: `--border`, `--input`, `--ring-base`, `--ring`

Light-mode values in `:root`, dark-mode overrides in `.dark`, Tailwind utility mappings in `@theme inline`.

See [`TOKENS.md`](./TOKENS.md) for what each shared token is for and which one to reach for.

`src/base.css` contains the shared base/reset layer (`* { box-sizing; border-color }`, `html` font-family + smoothing, `body` background/colour/line-height). Imported by app, website, and blog after `tokens.css`. Package-specific base rules (page chrome, rich-text content) stay in the consuming package.

`src/marketing.css` contains the marketing-site chrome shared by website and blog only: the `--hero-glow` / `--highlights-opacity` / `--highlights-gradient` variables and the tiled survey-paper texture behind `<main>`. Not imported by app or docsite. Each site keeps its own `/image/survey-bg-{light,dark}.jpg` asset; the blog adds a local full-bleed positioning override.

## What does NOT live here

Package-specific variables stay in their own CSS files:

| Package | File | App-specific tokens |
|---------|------|---------------------|
| `package/app` | `src/styles/*.css` | Alert/toast palette (`alerts.css`); sidebar, chart, code, scrollbar, `--editor-active-bg` (`tokens-app.css`) |
| `package/website` | `src/styles/global.css` | `--highlights-icon-bg`, `--highlights-text`, `--highlights-text-muted`, `.btn-*` component classes |
| `package/blogsite` | `src/styles/global.css` | `.post-content` typography and the `main::before` full-bleed override (no custom properties of its own) |
| `package/docsite` | `src/styles/custom.css` | Starlight-specific overrides (`--sl-color-*`) |

## Updating tokens

Edit `src/tokens.css` directly — no build step required. Consuming packages pick up changes automatically on their next build or dev server restart.

## Brand colour

The primary brand colour is defined once in `src/brand.css` as `--brand-l` / `--brand-c` / `--brand-hue` (currently `oklch(43.039% 0.11754 137.924)`), exposed as `--brand-primary`.

- `tokens.css` `@import`s `brand.css` and derives `--primary-base` from `--brand-primary`, so app / website / blog pick up a change automatically.
- `package/docsite/src/styles/custom.css` `@import`s `veysur-theme/brand.css` directly (Starlight uses its own `--sl-*` token system and does not consume `tokens.css`) and builds its accent ramp from `--brand-primary` / `--brand-hue`.

Changing the brand colour is now a single edit to `src/brand.css`.

## How consuming packages import

```css
@import 'tailwindcss';
@import 'veysur-theme/palette.css';
@import 'veysur-theme/tokens.css';
@import 'veysur-theme/base.css';
```

These must appear after `@import 'tailwindcss'` (and `@import 'tw-animate-css'` in the app), in this order, before any package-specific variable declarations. `docsite` is the exception: it imports only `palette.css` and `brand.css` (no `tokens.css`/`base.css`) because Starlight supplies its own base layer and token system.
