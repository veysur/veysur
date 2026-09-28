import {
  SurveyLanguageData,
  ImportSurveyEntity,
  ImportSectionEntity,
  ImportElementEntity,
} from 'veysur-common'

import {
  EntityEmbeddedFileManifestEntry,
  EntityParsedData,
} from '../../EntityHandlerInterface'
import { FileResolution } from '../SurveyPublicationEntityHandler/types'

export type VsstParticipantAttribute = {
  name: string
  required: boolean
  example?: string | null
  languages: Record<string, { label?: string; description?: string }>
}

export type EmailTemplateEntry = {
  type: string
  lang: string
  subject?: string | null
  body?: string | null
}

export type { ImportSurveyEntity, ImportSectionEntity, ImportElementEntity }

export type VsstParsedBundle = {
  surveyData: {
    version: string
    survey: ImportSurveyEntity
    sections: ImportSectionEntity[]
    elements: ImportElementEntity[]
    surveyLanguages?: Array<{
      _id?: string
      languageCode: string
      data: SurveyLanguageData
    }>
    participantAttributes?: VsstParticipantAttribute[]
    emailTemplates?: EmailTemplateEntry[]
  }
  embeddedFileEntries: EntityEmbeddedFileManifestEntry[]
  parsedData: EntityParsedData
}

/** Language data after ID translation but before projectId/timestamps are stamped at persist time. */
export type ResolvedSurveyLanguage = {
  _id?: string
  surveyId: string
  languageCode: string
  data: SurveyLanguageData
}

/** Participant attribute definition resolved to the new surveyId, before persist time. */
export type ResolvedParticipantAttribute = {
  surveyId: string
  name: string
  required: boolean
  example?: string | null
  languages: Record<string, { label?: string; description?: string }>
}

/** Email template resolved to the new surveyId, before persist time. */
export type ResolvedEmailTemplate = {
  surveyId: string
  type: string
  lang: string
  subject?: string | null
  body?: string | null
}

export type VsstResolvedContext = {
  survey: ImportSurveyEntity
  sections: ImportSectionEntity[]
  elements: ImportElementEntity[]
  surveyLanguages: ResolvedSurveyLanguage[]
  participantAttributes: ResolvedParticipantAttribute[]
  emailTemplates: ResolvedEmailTemplate[]
  embeddedFileEntries: EntityEmbeddedFileManifestEntry[]
  parsedData: EntityParsedData
  fileResolutions: FileResolution[]
  imageSetIdMap: Record<string, string>
}

export { FileResolution }

/**
 * markdown-format (survey-markdown-format.md v1) parsed/resolved shapes.
 * Deliberately lighter than the vsst bundle types above: no file archive,
 * no surveyLanguages/participantAttributes/emailTemplates (all out of scope
 * for markdown v1 per spec §2.1). `sourceFormat` is a discriminant used by
 * `SurveyEntityHandler.validateImport`/`.persistImport` to route between the
 * markdown and vsst pipelines without touching the vsst types above (their
 * `data` param is `unknown`, so no format is otherwise available at those
 * call sites).
 */
export type MarkdownParsedSurvey = ImportSurveyEntity & {
  name: string
  title: Record<string, string>
  language: { default: string; options: string[] }
}

export type MarkdownParsedBundle = {
  sourceFormat: 'markdown'
  survey: MarkdownParsedSurvey
  sections: ImportSectionEntity[]
  elements: ImportElementEntity[]
}

export type MarkdownResolvedContext = {
  sourceFormat: 'markdown'
  survey: ImportSurveyEntity
  sections: ImportSectionEntity[]
  elements: ImportElementEntity[]
}
