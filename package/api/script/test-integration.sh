#!/bin/bash
#
# Run the MySQL integration suites (*.integration.test.ts) against a throwaway
# MySQL container. Zero manual setup — needs only Docker.
#
# The container (see docker-compose.test.yml) is left running between invocations
# so repeat runs start instantly. Remove it with `pnpm test:integration:down`.
#
# Extra args are forwarded to jest, e.g.  pnpm test:integration -- RepoTask
#
set -euo pipefail

DIR_PATH=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
COMPOSE_FILE="$DIR_PATH/../docker-compose.test.yml"

# MYSQL_PASSWORD from config-dev.env becomes the container's root password, so a
# throwaway container and a real dev MySQL are interchangeable.
set -a
source "$DIR_PATH/../config-dev.env"
set +a

echo "==> Starting test MySQL (docker compose up --wait)..."
docker compose -f "$COMPOSE_FILE" up -d --wait

# --testPathIgnorePatterns replaces the jest-config value, dropping the
# `*.integration.test.ts` exclusion so these files run. With no extra args, also
# restrict to the integration files; with args, they are the jest path filter
# (e.g. `pnpm test:integration -- RepoTask`).
JEST_ARGS=(--testPathIgnorePatterns='/node_modules/')
if [ "$#" -eq 0 ]; then
  JEST_ARGS+=(--testPathPatterns='integration\.test\.ts$')
else
  JEST_ARGS+=("$@")
fi

MYSQL_HOST=127.0.0.1 \
MYSQL_PORT=33306 \
MYSQL_USER=root \
MYSQL_PASSWORD="$MYSQL_PASSWORD" \
NODE_ENV=test \
  jest "${JEST_ARGS[@]}"
