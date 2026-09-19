#!/usr/bin/env bash
# Guard against the pre-phase-7 survey vocabulary creeping back in.
#
# The SurveySection + SurveyElement reshape removed every `SurveyQuestionGroup` /
# `SurveyQuestionCollection` alias, the `element.groupId` field, and the
# `survey.questions` / `.groups` / `.questionIds` / `.groupIds` getters. New code
# must use `SurveySection` / `SurveyElementCollection` / `element.sectionId` /
# `survey.elements` / `survey.sections` / `survey.elementIds` / `survey.sectionIds`.
#
# Still-legitimate uses (excluded below):
#   - `SettingSurvey` `presentation.group*` / `format: 'group'` (unrelated setting)
#   - the production data migration + its `migrateLegacySurvey*` helpers, whose
#     whole job is to read the pre-phase-7 stored shape
set -euo pipefail

cd "$(dirname "$0")/.."

PATTERN='\bSurveyQuestionGroup(Collection|Data)?\b|\bSurveyQuestionCollection\b|\.groupId\b|\.groupIds\b|\.questionIds\b|\bsurvey\.groups\b|\bsurvey\.questions\b|\bsurvey\.groupIds\b|\bsurvey\.questionIds\b'

# Paths where the old vocabulary is still expected.
EXCLUDES=(
  ':(exclude)package/common/src/model/constructor/SettingSurvey/**'
  ':(exclude)**/*.snap'
  ':(exclude)docs/**'
  ':(exclude)package/api/src/migrate/**'
  ':(exclude)package/common/src/util/migrateLegacySurvey*'
)

if git grep -nE "$PATTERN" -- 'package/common/src' 'package/api/src' 'package/app/src' "${EXCLUDES[@]}"; then
  echo
  echo "ERROR: pre-phase-7 survey vocabulary found (see docs/decisions/2026/2026-09-08_survey-section-element-model.md)."
  exit 1
fi

echo "survey-alias guard: clean"
