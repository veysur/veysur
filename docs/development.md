<!-- cspell:ignore tsx rsbuild HMR MailCatcher -->

# Development

**Parent:** [README.md](./README.md)

Only Docker (Compose 2.22 or later) is needed to run the whole stack with live reload.

```bash
pnpm install
./deploy/scripts/config-generate.sh --dev   # once: writes deploy/.env
pnpm dev:migrate                            # create or update the local database
pnpm dev                                    # docker compose watch
pnpm dev:admin-account --email you@example.com   # another terminal: first account
```

Open <http://localhost:8080> (not port 80). Outgoing mail is caught by MailCatcher (the `fake-smtp` service)
at <http://localhost:1080>; set `VEYSUR_MAIL_UI_PORT` to move it.

## How the dev stack works

`deploy/compose.dev.yaml` layers over `compose.yaml`. It turns Caddy and the task manager off and serves
everything through `nginx.dev.conf`, which proxies the rsbuild dev server and the API.

- **One dev image** (`deploy/docker/Dockerfile.dev`) bakes dependencies and the built workspace libraries.
  `package/api/src`, `package/app/src` and `package/common/src` are bind-mounted, so edits apply live.
  `docker compose watch` rebuilds the image only when `pnpm-lock.yaml` or a package `package.json` changes.
- **API** runs with `tsx watch`; expect about 11 s from an edit to the API serving again. **App** runs the
  rsbuild dev server with hot module replacement, under a second.
- **Migrations** run from compiled output in a cached `dist` volume, because the patch scanner loads every
  `.ts` file it finds, including `*.integration.test.ts`. The first run compiles (about 14 s).
- **Limits:** a change to `package/common` needs `docker compose build`, since its built output is baked into
  the image.

Without Docker, `pnpm dev:api`, `dev:account`, `dev:survey` and `dev:docsite` run one package on the host
(`pnpm dev:admin` runs the admin app dev server; it is not the account bootstrap).

## Tests and checks

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

- **Jest and the pnpm store.** `moduleNameMapper` entries pin transitive dependencies inside the pnpm store,
  whose location differs between checkouts. `scripts/jest-pnpm-paths.cjs` finds it, and each package's
  `jest.config.js` (`.cjs` in `app`) applies it to `jest.base.json`. The API config also lists plain
  `node_modules` so transitive requires resolve per package instead of through pnpm's hoisted path.
- **Integration tests** (`*.integration.test.ts`) need MySQL: `pnpm --filter veysur-api test:integration`.
- **Repo guards** run in the pre-commit hook and can be run directly: `scripts/check-no-private-repo-refs.sh`,
  `check-no-cloud-detail-in-docs.sh`, `check-survey-aliases.sh`, `check-survey-element-casts.sh`.

There is no CI workflow yet; run the commands above before opening a pull request. See
[CONTRIBUTING.md](../CONTRIBUTING.md) for the contribution process and CLA.
