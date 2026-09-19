/**
 * Shape of raw survey export/import data (parsed from an uploaded JSON
 * file). Genuinely external, untyped input - fields beyond the ones each
 * validator/repairer/translator actually reads are unconstrained, since
 * older export versions may carry a different attribute set.
 */
export interface ImportEntity extends Record<string, unknown> {
  _id: string
  code?: string
}

export interface ImportElementEntity extends ImportEntity {
  /** `'content'` for a content element; anything else (or absent) is a question. */
  kind?: string
  type?: string
  surveyId?: string
  sectionId?: string
  /** Content-element config (e.g. `{ youtube: { url, videoId, startAt } }`). */
  config?: Record<string, unknown>
  subquestions?: ImportEntity[]
  answerOptions?: ImportEntity[]
}

export interface ImportSectionEntity extends ImportEntity {
  code?: string
  kind?: string
  surveyId?: string
  config?: Record<string, unknown>
  elementIds?: string[]
}

export interface ImportSurveyEntity extends ImportEntity {
  surveyId?: string
  sectionIds?: string[]
  elementIds?: string[]
}

export interface ImportSurveyData {
  survey: ImportSurveyEntity
  sections: ImportSectionEntity[]
  elements: ImportElementEntity[]
}
