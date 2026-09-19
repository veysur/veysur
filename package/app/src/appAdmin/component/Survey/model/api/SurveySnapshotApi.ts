import {
  SurveySnapshot,
  SurveySnapshotPartial,
  SurveyComparisonResult,
  MergeOptions,
  MergeResult,
} from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { Api, ErrorRest } from 'model'

export interface SurveySnapshotApiResponse {
  snapshot: PropsOf<SurveySnapshotPartial>
  snapshotData?: PropsOf<SurveySnapshot>
  // Other response properties may be added here later
}

export interface SurveySnapshotPublishedApiResponse {
  snapshot: PropsOf<SurveySnapshotPartial>
  snapshotData: null
}

export interface SurveySnapshotListApiResponse {
  snapshots: SurveySnapshotPartial[]
  snapshotCount: number
}

export interface SurveyComparisonApiResponse {
  snapshot: {
    _id: string
    label: string | null
    notes: string | null
    createdAt: Date
  }
  current: {
    _id: string
    name: string
    updatedAt: Date
  }
  comparison: SurveyComparisonResult
}

export class SurveySnapshotApi extends Api {
  async getAll(
    surveyId: string,
    page: number = 1,
    perPage: number = 20,
  ): Promise<SurveySnapshotListApiResponse> {
    try {
      return await this.getClient().get<SurveySnapshotListApiResponse>(
        `/survey-snapshot/${surveyId}`,
        {
          params: {
            page,
            perPage,
          },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async deleteMany(surveyId: string, snapshotIds: string[]): Promise<void> {
    try {
      await this.getClient().post(`/survey-snapshot/${surveyId}/delete-many`, {
        snapshotIds,
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async update(
    surveyId: string,
    snapshotId: string,
    data: { label?: string | null; notes?: string | null },
  ): Promise<SurveySnapshotApiResponse> {
    try {
      return await this.getClient().patch<SurveySnapshotApiResponse>(
        `/survey-snapshot/${surveyId}/${snapshotId}`,
        data,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async get(
    surveyId: string,
    snapshotId: string,
  ): Promise<SurveySnapshotApiResponse> {
    try {
      return await this.getClient().get<SurveySnapshotApiResponse>(
        `/survey-snapshot/${surveyId}/${snapshotId}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async compareWithCurrent(
    surveyId: string,
    snapshotId: string,
  ): Promise<SurveyComparisonApiResponse> {
    try {
      return await this.getClient().get<SurveyComparisonApiResponse>(
        `/survey-snapshot/${surveyId}/compare-with-current/${snapshotId}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async mergeResponses(
    surveyId: string,
    targetSnapshotId: string,
    sourceSnapshotId: string,
    options?: MergeOptions,
  ): Promise<MergeResult> {
    try {
      return await this.getClient().post<MergeResult>(
        `/survey-snapshot/${surveyId}/${targetSnapshotId}/merge-from/${sourceSnapshotId}`,
        { options },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
