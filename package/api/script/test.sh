#!/bin/bash
DIR_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
set -a
source "$DIR_PATH/../config-dev.env"
set +a
NODE_ENV=test jest "$@"
