import { Api, ErrorRest } from 'model'
import type { SurveyAnswers } from 'component/Survey/SurveyTypes'

export interface SurveyParticipantResponseData {
  response: {
    answers: SurveyAnswers
    randomSeeds?: Record<string, number>
    completed?: boolean
    completedAt?: Date | null
    language?: string | null
  }
}

export class SurveyParticipantResponseApi extends Api {
  async saveResponse(
    surveyId: string,
    response: {
      answers: SurveyAnswers
      randomSeeds?: Record<string, number>
      completedAt?: boolean
      language?: string
    },
    authToken: string,
  ): Promise<void> {
    try {
      await this.getClient().post<void>(
        `/survey-participant-response/${surveyId}`,
        {
          response,
        },
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

  async getResponse(
    surveyId: string,
    authToken: string,
  ): Promise<SurveyParticipantResponseData> {
    try {
      return await this.getClient().get<SurveyParticipantResponseData>(
        `/survey-participant-response/${surveyId}`,
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
