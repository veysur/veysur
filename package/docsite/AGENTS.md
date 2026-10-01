# AGENTS.md

This file provides guidance for creating and maintaining content in the `veysur-docsite` package — an Astro Starlight (a documentation framework built on Astro) site served at `docs.veysur.com`.

This documentation site is used to document VeySur project functionality. It must not be used to document account related functionality.

The `self-hosting/` section documents deploying and maintaining the project software on an operator's own server. That is project functionality, not account functionality. Keep it to short task pages and link to `external/veysur/docs/` on GitHub for depth (absolute URLs).

## Content Categories

Content files live under `src/content/docs/`. Place new files in the appropriate directory:

| Directory | Purpose |
|---|---|
| `getting-started/` | First-use walkthroughs for new administrators |
| `guides/` | Task-oriented procedures (e.g. publishing a survey) |
| `reference/` | Feature reference — survey editor, question types, import/export |

## Adding a Page

1. Create a `.md` file in the appropriate directory using kebab-case naming that matches the intended URL slug (e.g. `invite-participants.md` → `/guides/invite-participants/`).
2. Add the required frontmatter:

   ```yaml
   ---
   title: Page Title
   description: One sentence describing the page content.
   ---
   ```

3. Register the page in the sidebar by adding a `{ label, slug }` entry to the matching section in `astro.config.mjs`:

   ```js
   { label: 'Page Title', slug: 'guides/page-title' }
   ```

   For nested sections (e.g. under `Survey Editor`), add the entry inside the relevant `items` array.

## Writing Style

All content must follow these rules:

- Write in British English.
- Keep each page between 500 and 2,000 characters, excluding frontmatter.
- Use active voice unless passive is genuinely clearer.
- Keep sentences under 20 words where possible.
- Use bullet points only for lists of three or more items; otherwise integrate into the paragraph.
- Do not use first-person ("I", "we") or second-person ("you") except inside step-by-step procedures addressing a direct user action.
- Do not use exclamation marks, rhetorical questions, or humour.
- Remove vague adverbs ("very", "really", "quite") or replace with precise terms.
- Spell out acronyms on first use unless they are industry-standard (e.g. HTML, UK).
- Do not assume prior knowledge; define necessary terms briefly.
- Avoid em-dashes, dramatic phrasing, and generalising openings such as "We've all…" or "Everyone has…".
- Avoid patterns typical of AI-generated text: repetitive academic vocabulary ("robust", "leverage", "utilise", "delve", "streamline"), overly symmetrical phrasing where two halves mirror each other too neatly, and robotic transition formulas ("Furthermore,", "It is worth noting that", "In conclusion,", "Notably,").
- End each page with a full stop.

## Terminology

Use these terms consistently. Do not switch between synonyms for the same concept.

| Use | Avoid |
|---|---|
| survey | questionnaire, form |
| publication | release, version |
| participant | respondent, user |
| start | begin, launch, initiate |
| VeySur | veysur, Veysur |

## Headings and Formatting

- Use `##` for the first heading below frontmatter; use `###` for subsections.
- Write internal links as absolute paths from the docs root (e.g. `/reference/survey-editor/elements/`).
- Use ordered lists for step-by-step procedures and unordered lists for feature or option lists.
- Use tables for option/description reference content.

## Video Tutorials

Embed a tutorial video with `<Video path="tutorials/<slug>" title="…" />`
(`src/components/Video.astro`), served from `/media/…`. Source `.mp4` + sibling
`.jpg` poster are never committed to this package. For local `pnpm dev:docsite`, `predev`
runs `scripts/media-sync.mjs`, which copies them from an `external/media` checkout, if
present, into the gitignored `public/media/`. Without that checkout the script skips and
the videos do not load. A deployed docsite needs its own host for `/media/`.

## Development Commands

```bash
pnpm dev:docsite                              # start local preview server
pnpm build:docsite                            # production build
pnpm --filter veysur-docsite typecheck        # type-check MDX and frontmatter
```