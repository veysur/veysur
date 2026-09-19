# veysur-theme

Shared CSS design token package for the VeySur monorepo. Provides a single source of truth for shadcn/Tailwind colour tokens used by `package/app` and `package/website`.

## Usage

Add the dependency to a consuming package:

```json
"veysur-theme": "workspace:*"
```

Then import in the package's root CSS file, after `@import 'tailwindcss'`:

```css
@import 'tailwindcss';
@import 'veysur-theme/tokens.css';
```

## Contents

`src/tokens.css` exports CSS custom properties for light (`:root`) and dark (`.dark`) modes, plus `@theme inline` mappings for Tailwind utility classes.

Package-specific variables (alert palette, sidebar, hero gradients, etc.) remain in each consuming package's own CSS file.

## No build step

This package exports its CSS source directly — there is nothing to compile. Changes to `src/tokens.css` take effect in consuming packages on their next build or dev server restart.
