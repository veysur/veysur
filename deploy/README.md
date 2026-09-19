# deploy

The Docker Compose stack for running VeySur. Full documentation is in [`../docs/`](../docs/README.md).

## Quickstart

```bash
./scripts/config-generate.sh                          # asks a few questions, writes .env
./scripts/deploy.sh                                   # migrates and starts everything
./scripts/admin-account-bootstrap.sh --email you@example.com
```

From a release tarball, run `./install.sh` instead of the first two lines. Update with
`./scripts/update.sh --tag <version>`. See [deployment](../docs/deployment.md).

## What is here

| Path | Purpose |
|---|---|
| `compose.yaml` | The production stack: Caddy, nginx, API, task manager, MySQL, Redis, one-shot `migrate` |
| `compose.dev.yaml` | Contributor overlay, see [development](../docs/development.md) |
| `nginx.conf`, `nginx.dev.conf` | Single-origin routing for production and development |
| `caddy/` | Front-door config and the four TLS snippets, see [tls](../docs/tls.md) |
| `mysql/` | Server config and first-start grants |
| `docker/` | `Dockerfile.api`, `Dockerfile.nginx` (production) and `Dockerfile.dev` |
| `scripts/` | `config-generate`, `deploy`, `update`, `admin-account-bootstrap`, `veysur`, `release-package` |
| `install.sh` | Top-level installer used from the release tarball |
| `.env.example` | Every configuration key, see [configuration](../docs/configuration.md) |

Build the images from the repository root:

```bash
docker build -f deploy/docker/Dockerfile.api -t veysur/api .
docker build -f deploy/docker/Dockerfile.nginx -t veysur/nginx .
```
