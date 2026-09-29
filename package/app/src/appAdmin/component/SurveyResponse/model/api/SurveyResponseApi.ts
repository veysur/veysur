import {
  SurveyResponse,
  CompletionStatus,
  CompletionStatusFilter,
} from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

import { Api, ErrorRest } from 'model'

export type SurveyResponseGetList = {
  response: PropsOf<SurveyResponse>[]
  responseCount: number
}

export class SurveyResponseApi extends Api {
  async getAll(
    surveyId: string,
    page: number = 1,
    perPage: number = 10,
    snapshotId?: string,
    publicationId?: string,
    completed?: CompletionStatusFilter,
    startDate?: string | null,
    endDate?: string | null,
    dateField?: 'createdAt' | 'completed' | 'updatedAt',
    search?: string,
    merged?: 'all' | 'merged' | 'notMerged',
  ): Promise<SurveyResponseGetList> {
    try {
      const params: {
        page: number
        perPage: number
        snapshotId?: string
        publicationId?: string
        completed?: CompletionStatus
        startDate?: string
        endDate?: string
        dateField?: 'completed' | 'updatedAt'
        search?: string
        merged?: 'merged' | 'notMerged'
      } = {
        page,
        perPage,
      }

      // Add optional filters
      if (snapshotId) {
        params.snapshotId = snapshotId
      }

      if (publicationId && publicationId.trim()) {
        params.publicationId = publicationId
      }

      if (completed && completed !== 'all') {
        params.completed = completed
      }

      if (startDate) {
        params.startDate = startDate
      }

      if (endDate) {
        params.endDate = endDate
      }

      if (dateField && dateField !== 'createdAt') {
        params.dateField = dateField
      }

      if (search && search.trim()) {
        params.search = search.trim()
      }

      if (merged && merged !== 'all') {
        params.merged = merged
      }

      return await this.getClient().get<SurveyResponseGetList>(
        `/survey-response/${surveyId}`,
        { params },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async getOne(
    surveyId: string,
    responseId: string,
  ): Promise<PropsOf<SurveyResponse>> {
    try {
      return await this.getClient().get<PropsOf<SurveyResponse>>(
        `/survey-response/${surveyId}/${responseId}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async create(
    surveyId: string,
    snapshotId: string,
    response: Partial<PropsOf<SurveyResponse>>,
    publicationId?: string,
  ): Promise<PropsOf<SurveyResponse>> {
    try {
      return await this.getClient().post<PropsOf<SurveyResponse>>(
        `/survey-response/${surveyId}/${snapshotId}`,
        { response, publicationId },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async update(
    surveyId: string,
    responseId: string,
    response: Partial<PropsOf<SurveyResponse>>,
  ): Promise<PropsOf<SurveyResponse>> {
    try {
      return await this.getClient().put<PropsOf<SurveyResponse>>(
        `/survey-response/${surveyId}/${responseId}`,
        { response },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async delete(
    surveyId: string,
    responseId: string | string[],
  ): Promise<PropsOf<SurveyResponse> | { deletedCount: number }> {
    try {
      const ids = Array.isArray(responseId) ? responseId.join(',') : responseId
      return await this.getClient().delete<
        PropsOf<SurveyResponse> | { deletedCount: number }
      >(`/survey-response/${surveyId}/${ids}`)
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
