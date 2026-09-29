// cspell:ignore jdoc
import { PropsOf } from '@datacapy/schema'

import { L10n } from '../model/constructor/L10n'
import {
  SECTION_CODE_THANK_YOU,
  SECTION_CODE_WELCOME,
  SECTION_KIND_GROUP,
  SECTION_KIND_THANK_YOU,
  SECTION_KIND_WELCOME,
} from '../model/constructor/Survey/SurveySection'
import { ELEMENT_KIND_QUESTION } from '../model/constructor/Survey/SurveyQuestion'

/**
 * Pure, idempotent transform from the pre-`elements`-branch stored Survey JSON
 * shape to the canonical section/element shape. Used only by the production
 * data migration
 * (`package/api/src/migrate/2026/09/2026-09-09_1000_reshape-survey-section-element.ts`)
 * — it is deliberately NOT wired into the `Survey` constructor, which is a
 * clean break on canonical keys only.
 *
 * Applies to the `survey` table jdoc and to the full Survey embedded in
 * `surveySnapshot.survey` / `surveySnapshotPartial.surveyPartial`.
 *
 * Transforms:
 * - `questions` → `elements`, `groups` → `sections`
 * - `questionIds` → `elementIds`, `groupIds` → `sectionIds`
 * - `content` → `contentFormat`
 * - each element: `groupId` → `sectionId`, add `kind: 'question'`
 * - each section: add `kind: 'group'`, drop the vestigial `questionIds`
 * - fold `welcome` / `thankYou` into singleton `sections` (ids/codes
 *   `WELCOME` / `THANKYOU`)
 *
 * Re-running on already-migrated JSON is a no-op.
 */

interface LegacyLink {
  url?: PropsOf<L10n>
  text?: PropsOf<L10n>
}

type Json = Record<string, unknown>

const isNonEmptyL10n = (v: unknown): boolean =>
  !!v && typeof v === 'object' && Object.keys(v as object).length > 0

const renameKey = (obj: Json, from: string, to: string): void => {
  if (from in obj) {
    if (obj[to] === undefined) obj[to] = obj[from]
    delete obj[from]
  }
}

export function migrateLegacySurveyJson<T extends Json>(input: T): T {
  if (!input || typeof input !== 'object') return input

  const survey: Json = { ...input }

  renameKey(survey, 'questions', 'elements')
  renameKey(survey, 'groups', 'sections')
  renameKey(survey, 'questionIds', 'elementIds')
  renameKey(survey, 'groupIds', 'sectionIds')
  renameKey(survey, 'content', 'contentFormat')

  const surveyId = typeof survey._id === 'string' ? survey._id : ''
  const createdById =
    typeof survey.createdById === 'string' ? survey.createdById : ''

  if (Array.isArray(survey.sections)) {
    survey.sections = survey.sections.map((raw) => {
      const section = { ...(raw as Json) }
      if (section.kind == null) section.kind = SECTION_KIND_GROUP
      delete section.questionIds
      return section
    })
  }

  if (Array.isArray(survey.elements)) {
    survey.elements = survey.elements.map((raw) => {
      const element = { ...(raw as Json) }
      if (element.kind == null) element.kind = ELEMENT_KIND_QUESTION
      if (element.sectionId == null && element.groupId != null) {
        element.sectionId = element.groupId
      }
      delete element.groupId
      return element
    })
  }

  foldLegacyWelcomeThankYou(survey, surveyId, createdById)

  return survey as T
}

function makeSection(
  surveyId: string,
  createdById: string,
  kind: string,
  code: string,
  desc: PropsOf<L10n> | undefined,
  config: Json | null,
): Json {
  return {
    _id: code,
    surveyId,
    createdById,
    kind,
    code,
    name: {},
    desc: desc && isNonEmptyL10n(desc) ? desc : null,
    attributes: {},
    config,
    condition: null,
    conditionReferences: null,
  }
}

function foldLegacyWelcomeThankYou(
  survey: Json,
  surveyId: string,
  createdById: string,
): void {
  const legacyWelcome = survey.welcome as
    { message?: PropsOf<L10n> } | undefined
  const legacyThankYou = survey.thankYou as
    { message?: PropsOf<L10n>; link?: LegacyLink } | undefined

  delete survey.welcome
  delete survey.thankYou

  if (!legacyWelcome && !legacyThankYou) return

  const sections: Json[] = Array.isArray(survey.sections)
    ? [...(survey.sections as Json[])]
    : []
  const sectionIds: string[] = Array.isArray(survey.sectionIds)
    ? [...(survey.sectionIds as string[])]
    : []
  const hasKind = (kind: string): boolean =>
    sections.some((s) => s.kind === kind)

  if (
    isNonEmptyL10n(legacyWelcome?.message) &&
    !hasKind(SECTION_KIND_WELCOME)
  ) {
    sections.unshift(
      makeSection(
        surveyId,
        createdById,
        SECTION_KIND_WELCOME,
        SECTION_CODE_WELCOME,
        legacyWelcome!.message,
        null,
      ),
    )
    if (!sectionIds.includes(SECTION_CODE_WELCOME)) {
      sectionIds.unshift(SECTION_CODE_WELCOME)
    }
  }

  const tyMessage = legacyThankYou?.message
  const tyUrl = legacyThankYou?.link?.url
  const tyText = legacyThankYou?.link?.text
  if (
    (isNonEmptyL10n(tyMessage) ||
      isNonEmptyL10n(tyUrl) ||
      isNonEmptyL10n(tyText)) &&
    !hasKind(SECTION_KIND_THANK_YOU)
  ) {
    const hasLink = isNonEmptyL10n(tyUrl) || isNonEmptyL10n(tyText)
    sections.push(
      makeSection(
        surveyId,
        createdById,
        SECTION_KIND_THANK_YOU,
        SECTION_CODE_THANK_YOU,
        tyMessage,
        hasLink ? { link: { url: tyUrl ?? {}, text: tyText ?? {} } } : null,
      ),
    )
    if (!sectionIds.includes(SECTION_CODE_THANK_YOU)) {
      sectionIds.push(SECTION_CODE_THANK_YOU)
    }
  }

  survey.sections = sections
  survey.sectionIds = sectionIds
}
