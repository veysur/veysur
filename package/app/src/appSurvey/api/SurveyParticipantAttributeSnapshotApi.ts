import { Api, ErrorRest } from 'model'

export interface ParticipantAttributeDefinition {
  name: string
  label: string
  description?: string
  required: boolean
  example: string | null
}

export interface SurveyParticipantAttributeSnapshotResponse {
  attributes: ParticipantAttributeDefinition[]
  languageDefault: string
  languageOptions: string[]
}

export class SurveyParticipantAttributeSnapshotApi extends Api {
  async get(
    surveyId: string,
    lang?: string,
  ): Promise<SurveyParticipantAttributeSnapshotResponse> {
    try {
      return await this.getClient().get<SurveyParticipantAttributeSnapshotResponse>(
        `/survey-participant-attribute-snapshot/${surveyId}`,
        { params: lang ? { lang } : undefined },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
