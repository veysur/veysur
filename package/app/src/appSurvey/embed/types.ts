import type { PropsOf } from '@datacapy/schema'
import type { SettingSurvey, Survey } from 'veysur-common'

// Shapes written by the API's ServiceSurveyEmbedArtefact
export interface SurveyEmbedPointer {
  version: number
  surveyId: string
  snapshotId: string
  publicationId: string
  languages: string[]
  defaultLanguage: string | null
  access: {
    embed?: boolean
    embedDomains?: string[] | null
    open?: boolean
    publicReg?: boolean
  }
  schedule?: { start: string | null; end: string | null }
  noBrandAvailable: boolean
  settingSurveyData: PropsOf<SettingSurvey>
}

export interface SurveyEmbedArtefact {
  snapshotData: { survey: PropsOf<Survey> }
}
