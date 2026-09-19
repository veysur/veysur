import { SurveyLanguageData } from '../model/constructor/SurveyLanguage'

/**
 * Pure, idempotent transform from the pre-`elements`-branch SurveyLanguage
 * `data` tree to the canonical section/element shape. Used only by the
 * production data migration — applies to `surveyLanguage.data` and to each
 * `surveyLanguageSnapshot.data` row.
 *
 * Transforms:
 * - `data.groups` → `data.sections` (entry shape unchanged: `{ name?, desc? }`)
 * - `data.questions` → `data.elements`, keyed by the same element `_id`
 *   (entry shape unchanged: `{ text?, detail? }`)
 * - `welcomeMessage` → `welcomeSectionDesc`, `thankYouMessage` →
 *   `thankYouSectionDesc`, `thankYouLinkUrl` → `thankYouSectionLinkUrl`,
 *   `thankYouLinkText` → `thankYouSectionLinkText`
 * - `subquestions` / `answerOptions` / `title` / `dataPolicyText` /
 *   `legalNoticeText` unchanged
 *
 * Re-running on already-migrated data is a no-op.
 */

type Json = Record<string, unknown>

const renameKey = (obj: Json, from: string, to: string): void => {
  if (from in obj) {
    if (obj[to] === undefined && obj[from] !== undefined) obj[to] = obj[from]
    delete obj[from]
  }
}

export function migrateLegacySurveyLanguageData(
  input: Record<string, unknown> | null | undefined,
): SurveyLanguageData {
  if (!input || typeof input !== 'object') return {}

  const data: Json = { ...input }

  // Merge legacy `questions` into `elements` (same `_id` keys); legacy
  // `groups` into `sections`. Preserve any already-canonical entries.
  if (data.questions && typeof data.questions === 'object') {
    data.elements = {
      ...(data.questions as Json),
      ...((data.elements as Json) ?? {}),
    }
    delete data.questions
  }
  if (data.groups && typeof data.groups === 'object') {
    data.sections = {
      ...(data.groups as Json),
      ...((data.sections as Json) ?? {}),
    }
    delete data.groups
  }

  renameKey(data, 'welcomeMessage', 'welcomeSectionDesc')
  renameKey(data, 'thankYouMessage', 'thankYouSectionDesc')
  renameKey(data, 'thankYouLinkUrl', 'thankYouSectionLinkUrl')
  renameKey(data, 'thankYouLinkText', 'thankYouSectionLinkText')

  return data as SurveyLanguageData
}
