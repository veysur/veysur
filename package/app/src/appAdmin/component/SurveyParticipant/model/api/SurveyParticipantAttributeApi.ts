import {
  SurveyParticipantAttributeDefinition,
  SurveyParticipantAttributeLanguageData,
} from 'veysur-common'

import { Api, ErrorRest } from 'model'

export type AttributeBatchChange = {
  attributeName: string
  newName?: string
  fields?: Partial<
    Pick<
      SurveyParticipantAttributeDefinition,
      'required' | 'internal' | 'example'
    >
  >
  language?: Record<string, SurveyParticipantAttributeLanguageData>
}

export type BatchSaveRequest = {
  changes: AttributeBatchChange[]
  orderedAttributeNames?: string[]
}

export interface SurveyParticipantAttributeListApiResponse {
  systemAttributes: Array<{ name: string } & Record<string, unknown>>
  attributes: Array<
    SurveyParticipantAttributeDefinition & {
      languages: Record<string, SurveyParticipantAttributeLanguageData>
    }
  >
}

export class SurveyParticipantAttributeApi extends Api {
  async getAll(
    surveyId: string,
  ): Promise<SurveyParticipantAttributeListApiResponse> {
    try {
      return await this.getClient().get<SurveyParticipantAttributeListApiResponse>(
        `/survey-participant-attribute/${surveyId}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async create(
    surveyId: string,
    attribute: Partial<SurveyParticipantAttributeDefinition>,
  ): Promise<SurveyParticipantAttributeDefinition> {
    try {
      return await this.getClient().post<SurveyParticipantAttributeDefinition>(
        `/survey-participant-attribute/${surveyId}`,
        { attribute },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async delete(surveyId: string, attributeName: string): Promise<boolean> {
    try {
      return await this.getClient().delete<boolean>(
        `/survey-participant-attribute/${surveyId}/${attributeName}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async batchSave(
    surveyId: string,
    request: BatchSaveRequest,
  ): Promise<boolean> {
    try {
      return await this.getClient().patch<boolean>(
        `/survey-participant-attribute/${surveyId}`,
        request,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
