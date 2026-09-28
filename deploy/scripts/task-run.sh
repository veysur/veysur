#!/usr/bin/env bash
# Runs a single task manager action once, outside the scheduler - the same
# one-off mechanism the scheduler itself uses (src/run.ts). Works against
# either stack: detect_dev() picks node dist/run.js vs pnpm exec tsx
# src/run.ts automatically. See package/api/docs/task-manager.md's "Manual
# Triggering" section for the full list of tasks/actions and examples.
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

TASK="" ACTION="" OPTIONS_JSON=""

while [ $# -gt 0 ]; do
  case $1 in
    --help | -h)
      cat <<USAGE
Usage: $0 <task> <action> [optionsJson]

Runs modelManager.services.<task>.<action>(options) once against the running
api container.

Examples:
  $0 dataTransferJob processQueue
  $0 email processQueue
  $0 fileDeletion hardDeleteAll '{"olderThan":"P1W"}'
USAGE
      exit 0 ;;
    -*) die "unknown option: $1" ;;
    *)
      if [ -z "$TASK" ]; then TASK=$1
      elif [ -z "$ACTION" ]; then ACTION=$1
      elif [ -z "$OPTIONS_JSON" ]; then OPTIONS_JSON=$1
      else die "unexpected argument: $1"
      fi
      shift ;;
  esac
done

[ -n "$TASK" ] || die "task name is required, e.g. dataTransferJob (see $0 --help)"
[ -n "$ACTION" ] || die "action name is required, e.g. processQueue (see $0 --help)"

require_docker
require_env_file
detect_dev

# The dev stack runs the API from source; production runs the compiled build.
if [ "${VEYSUR_DEV:-0}" = 1 ]; then
  run_api=(pnpm exec tsx src/run.ts)
else
  run_api=(node dist/run.js)
fi

env_args=(-e API_TASK="$TASK" -e API_ACTION="$ACTION")
[ -z "$OPTIONS_JSON" ] || env_args+=(-e API_TASK_JSON="$OPTIONS_JSON")

compose exec -T "${env_args[@]}" api "${run_api[@]}"
