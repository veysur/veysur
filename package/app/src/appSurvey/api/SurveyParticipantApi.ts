import { Api, ErrorRest } from 'model'

export interface SurveyParticipantMeResponse {
  nameFirst: string
  nameLast: string
  email: string
  language: string
  token: string | null
  attributes: Record<string, string>
}

export class SurveyParticipantApi extends Api {
  async getMe(
    surveyId: string,
    authToken: string,
  ): Promise<SurveyParticipantMeResponse | null> {
    try {
      return await this.getClient().get<SurveyParticipantMeResponse | null>(
        `/survey-participant/${surveyId}/me`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
