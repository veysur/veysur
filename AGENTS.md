# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) and other AI
coding agents working in this repository.

## What this repository is

VeySur is a survey platform: build a survey, publish it, collect responses.
This repository is the source-available, self-hostable edition, covering
the survey model, the survey editor, the survey-taking application, and
account management.

## Repository structure

A pnpm workspace monorepo. As packages land here, expect this shape:

- **`package/common`** - shared TypeScript library (survey model, schema,
  validation, shared utilities)
- **`package/app`** - React frontend (survey editor, survey-taking,
  account management)
- **`package/api`** - Node.js backend API server
- **`package/theme`** - shared design tokens and CSS consumed by the
  frontend
- **`package/docsite`** - user-facing documentation site
- **`deploy/`** - the Docker Compose stack, production Dockerfiles and
  operator scripts for self-hosting
- **`external/`** - git submodules for standalone shared libraries this
  project depends on

All packages use the pnpm workspace protocol (`workspace:*`) for
inter-package dependencies.

## Development

Once packages land, the usual commands apply per package:

- `pnpm install` - install all dependencies
- `pnpm build` - build all packages
- `pnpm test` - run all tests
- `pnpm lint` - run linting
- `pnpm typecheck` - type-check all packages

Each package has its own `AGENTS.md` with package-specific commands and
conventions once it's added.

## Code style

- **TypeScript**: prefer concrete types; fall back to `unknown` with
  narrowing when a shape is genuinely dynamic. Never use `any`. `as unknown
  as X` is a last resort, only when crossing a genuine third-party
  boundary with no typed alternative.
- **Formatting**: Prettier, 2 spaces, no semicolons, single quotes.
- **Imports**: ES6 modules, prefer named imports.
- **Comments**: default to none. Only add one when the reasoning behind the
  code isn't obvious from reading it: a hidden constraint, a workaround for
  a specific bug, behaviour that would surprise a reader. Don't explain what
  the code does; well-named identifiers already do that.
- **No premature abstraction**: three similar instances can justify pulling
  out a shared helper; one or two should stay concrete. Don't design for
  requirements you don't have yet.

## Writing style

No em-dashes anywhere in this repository: prose, docs, code comments, commit messages, PR
descriptions. Use a comma, colon, semicolon, or a full stop and a new sentence instead. It's
the single most common tell in AI-generated writing, so treat it as a hard rule, not a style
preference.

## Timestamp field naming

Every `Date`-typed field name must convey *when* it happened, through one of
these suffixes (or, nested under a parent object whose name already scopes
the meaning, the bare lowercase word on its own):

| Suffix | Bare (nested) form | Use for |
|---|---|---|
| `At` | `at` | A single point-in-time event (`createdAt`, `expiresAt`) |
| `From` | `from` | The start of a range paired with `To` |
| `To` | `to` | The end of a range paired with `From` |
| `Start` | `start` | The start of a range paired with `End` |
| `End` | `end` | The end of a range paired with `Start` |
| `Until` | `until` | A deadline framed as "valid until" |

A bare field name with no qualifying suffix (`expires`, `completed`) isn't
acceptable. When in doubt, default to `At`.

## Testing

Colocated tests in `src/**/*.test.{ts,tsx}`, run with Jest. New behaviour
needs a test; a bug fix needs a test that would have caught it.

## Committing changes

Conventional commit messages (`type(scope): summary`), imperative present
tense. Keep pull requests focused on one logical change.

## Documentation

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution process and
CLA, [LICENSE](./LICENSE) and [FAQ.md](./FAQ.md) for licensing, and
[TRADEMARKS.md](./TRADEMARKS.md) for the VeySur name and logo policy.
