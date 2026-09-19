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
