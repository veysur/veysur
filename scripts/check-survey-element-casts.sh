#!/usr/bin/env bash
# Guard against inline structural assertions on survey elements / sections.
#
# `SurveyElementBase` declares `kind`, and `SurveySection` declares
# `kind: SectionKind`. Kind-specific fields (`config`, `detail`, `answerOptions`,
# `subquestions`) are reached by narrowing through `isSurveyContent` /
# `isSurveyQuestion` (from `veysur-common`), never with an inline
# `element as { config?: unknown }` / `section as { kind?: string }` cast.
#
# See the "Typing Discipline" section in the root AGENTS.md.
set -euo pipefail

cd "$(dirname "$0")/.."

# `as { kind?: ... }`, `as { config?: ... }`, `as { detail?: ... }`,
# `as { answerOptions?: ... }`, `as { subquestions?: ... }`,
# `as { sectionId?: ... }` — the inline structural-assertion form (optional
# member). Non-optional shapes (`as { kind: string; desc: ... }`) are patch /
# wire payload assertions, tracked separately as use case 5.
PATTERN='as \{ *(kind|config|detail|answerOptions|subquestions|sectionId)\?:'

EXCLUDES=(
  ':(exclude)**/*.snap'
  ':(exclude)docs/**'
)

if git --no-pager grep -nE "$PATTERN" -- 'package/common/src' 'package/api/src' 'package/app/src' "${EXCLUDES[@]}"; then
  echo
  echo "ERROR: inline structural assertion on a survey element/section found."
  echo "Narrow through isSurveyContent / isSurveyQuestion, or read section.kind directly."
  echo "See the Typing Discipline section in AGENTS.md."
  exit 1
fi

echo "survey-element-cast guard: clean"
