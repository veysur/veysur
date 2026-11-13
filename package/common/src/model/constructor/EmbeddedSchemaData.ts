/**
 * Data shapes of the hand-written L10n schemas (`SchemaL10n`, `SchemaL10nHtml`,
 * `SchemaL10nUrl`), so a tagged interface can reference them through
 * `importMap`. The schemas stay hand-written: each carries its own length limit
 * and filters.
 */

/** @schema l10n */
export interface L10nData {
  [language: string]: string
}

/** @schema l10nHtml */
export interface L10nHtmlData {
  [language: string]: string
}

/** @schema l10nUrl */
export interface L10nUrlData {
  [language: string]: string
}

/**
 * Marker for the hand-written `SchemaSurveySection`, which `SurveyDocument` embeds.
 *
 * @schema surveySection
 */
export interface SurveySectionDocument {
  _id?: string | null
}

/**
 * Marker for the hand-written `SchemaSurveyElement`, which `SurveyDocument` embeds.
 *
 * @schema surveyElement
 */
export interface SurveyElementDocument {
  _id?: string | null
}
