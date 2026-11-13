import { SurveyAnswerOptionImageValue } from './Survey/SurveyAnswerOption'
import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import { SchemaSurveyLanguage } from './SurveyLanguage.schema'

export interface SurveyLanguageSectionEntry {
  name?: string
  desc?: string
}

/**
 * One element's translatable text, keyed by element `_id`. `text` covers a
 * question's prompt and a content element's body; `detail` is question-only.
 */
export interface SurveyLanguageElementEntry {
  text?: string
  detail?: string
}

export interface SurveyLanguageAnswerOptionEntry {
  label?: string
  image?: SurveyAnswerOptionImageValue | null
}

export interface SurveyLanguageData {
  title?: string
  /** Welcome / thank-you singleton section text (phase 1c). */
  welcomeSectionDesc?: string
  thankYouSectionDesc?: string
  thankYouSectionLinkUrl?: string
  thankYouSectionLinkText?: string
  dataPolicyText?: string
  legalNoticeText?: string
  sections?: Record<string, SurveyLanguageSectionEntry>
  /** Every element (question and content), keyed by element `_id`. */
  elements?: Record<string, SurveyLanguageElementEntry>
  subquestions?: Record<string, SurveyLanguageElementEntry>
  answerOptions?: Record<string, SurveyLanguageAnswerOptionEntry>
}

type InternalId = string & t.MaxLength<17>

/** @schema surveyLanguage construct=SurveyLanguage strict */
export interface SurveyLanguageFields {
  _id: InternalId & t.Required & t.InitFn<'genUniqueId'>
  surveyId: InternalId & t.Required
  languageCode: string & t.Required & t.MaxLength<2>
  data: SurveyLanguageData & t.Required & t.Init<t.EmptyObject> & t.NonStrict & t.Opaque
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}

/** Fields come from the generated {@link SchemaSurveyLanguage}. */
export class SurveyLanguage extends SchemaConstructor.from(
  SchemaSurveyLanguage,
) {
  update(data: Partial<SurveyLanguage>): SurveyLanguage {
    return new SurveyLanguage({ ...this, ...data })
  }
}

export default SurveyLanguage
