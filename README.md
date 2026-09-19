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
```

The self-host runtime is Docker Compose. See [deploy/](./deploy) for the Compose
stack and operator scripts; both are being built up phase by phase.

## Status

Bootstrapping. The Compose deploy layer is still being added to this repository.
