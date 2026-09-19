# VeySur

Source-available, self-hostable edition of VeySur.

This repository is the canonical home for the VeySur survey product, the
application people use to build, publish, and take surveys.

## Licence

Source-available under the [Elastic License 2.0](./LICENSE). Free to use,
self-host, and modify; you may not offer it to third parties as a hosted or
managed service. See [FAQ.md](./FAQ.md) for what that does and doesn't
cover, and [TRADEMARKS.md](./TRADEMARKS.md) for the VeySur name/logo policy.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions require signing
the [CLA](./CLA.md). Found a security issue? See [SECURITY.md](./SECURITY.md)
rather than filing a public issue.

## Development

```bash
pnpm install
./deploy/scripts/config-generate.sh --dev   # once: writes deploy/.env for local development
pnpm dev:migrate                            # create or update the local database
pnpm dev                                    # API, app dev server and proxy with live reload
pnpm dev:admin-account --email you@example.com      # in another terminal: create the first account
```

Open <http://localhost:8080>. Only Docker (Compose 2.22 or later) is needed; there is no
Kubernetes tooling. Outgoing mail lands in a local inbox at <http://localhost:1080>. API and app
source edits reload live; a change to `pnpm-lock.yaml` or a `package.json` rebuilds the dev image.

The self-host runtime is Docker Compose. See [deploy/](./deploy) for the Compose
stack and operator scripts; both are being built up phase by phase.

## Status

Bootstrapping. The Compose deploy layer is still being added to this repository.
