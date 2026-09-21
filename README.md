# VeySur

Source-available, self-hostable VeySur.

This repository is the canonical home for the VeySur survey product, the
application people use to build, publish, and take surveys.

## Licence

Source-available under the [Elastic License 2.0](./LICENSE). Free to use,
self-host, and modify; you may not offer it to third parties as a hosted or
managed service. See [FAQ.md](./FAQ.md) for what that does and doesn't
cover, and [TRADEMARKS.md](./TRADEMARKS.md) for the VeySur name/logo policy.

## Self-hosting

VeySur runs on one server with Docker Compose: the survey editor, the survey-taking app and account
management on a single domain, with Caddy for HTTPS, nginx, the API, MySQL and Redis.

You need:

- A Linux server with Docker (Compose 2.22 or later), 4 GB of RAM and 10 GB of free disk.
- A domain name pointing at the server, with ports 80 and 443 open.
- An SMTP relay for password resets and survey invitations. The stack does not include a mail server.

Install from a release package (`veysur-<version>-with-images.tar.gz` bundles the container images):

```bash
tar -xzf veysur-<version>-with-images.tar.gz && cd veysur
./install.sh                                                  # asks a few questions and starts VeySur
./scripts/admin-account-bootstrap.sh --email you@example.com  # creates the first administrator
./scripts/veysur.sh mail-test you@example.com                 # checks that e-mail is sent
```

Then open your domain in a browser and sign in with the password the script printed.

| To do this | Read |
|---|---|
| Install step by step | [docs/deployment.md](./docs/deployment.md) |
| Set up SMTP and the sender address | [docs/email.md](./docs/email.md) |
| Understand file storage | [docs/storage.md](./docs/storage.md) |
| Choose an HTTPS mode | [docs/tls.md](./docs/tls.md) |
| Look up every setting | [docs/configuration.md](./docs/configuration.md) |
| Upgrade, back up, restore or move to a new server | [docs/maintenance.md](./docs/maintenance.md) |

Back up before you rely on it. `./scripts/backup.sh` saves the database, the uploaded files and your
configuration, including encryption keys that cannot be recovered any other way. Only the latest release
receives fixes, so plan to upgrade (see [SECURITY.md](./SECURITY.md)).

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

See [docs/](./docs/README.md) for architecture and development notes, and [deploy/](./deploy) for the Compose stack and
operator scripts.
