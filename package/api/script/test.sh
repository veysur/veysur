#!/bin/bash
DIR_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
set -a
# Optional: the suite sets NODE_ENV=test itself, so a fresh checkout has no file to load.
[ -f "$DIR_PATH/../config-dev.env" ] && source "$DIR_PATH/../config-dev.env"
set +a
NODE_ENV=test jest "$@"
