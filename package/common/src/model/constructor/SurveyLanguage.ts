import { genUniqueId } from 'mzen-id'

import { SurveyAnswerOptionImageValue } from './Survey/SurveyAnswerOption'

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
  /** @deprecated Superseded by {@link welcomeSectionDesc} (phase 1c slice 4). No longer written or read; kept so stored rows still type-check. */
  welcomeMessage?: string
  /** @deprecated Superseded by {@link thankYouSectionDesc}. */
  thankYouMessage?: string
  /** @deprecated Superseded by {@link thankYouSectionLinkUrl}. */
  thankYouLinkUrl?: string
  /** @deprecated Superseded by {@link thankYouSectionLinkText}. */
  thankYouLinkText?: string
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

export class SurveyLanguage {
  _id: string
  surveyId: string
  languageCode: string
  data: SurveyLanguageData
  createdAt: Date
  updatedAt: Date

  constructor(data?) {
    this._id = data?._id || genUniqueId()
    this.surveyId = data?.surveyId
    this.languageCode = data?.languageCode
    this.data = data?.data ?? {}
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.updatedAt && new Date(data.updatedAt)) || new Date()
  }

  update(data: Partial<SurveyLanguage>): SurveyLanguage {
    return new SurveyLanguage({ ...this, ...data })
  }
}

export default SurveyLanguage
