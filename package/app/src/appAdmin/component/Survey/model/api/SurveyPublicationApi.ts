import {
  SurveyPublication,
  SurveySnapshot,
  SurveySnapshotPartial,
  MergeOptions,
  MergeResult,
} from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

import { Api, ErrorRest } from 'model'

export interface SurveyPublicationResponse {
  publication: PropsOf<SurveyPublication>
  snapshot: PropsOf<SurveySnapshotPartial>
  snapshotData?: PropsOf<SurveySnapshot>
  wasReused?: boolean
  contentHash?: string
}

export interface SurveyPublicationPublishedResponse {
  publication: PropsOf<SurveyPublication> | null
  snapshot: PropsOf<SurveySnapshotPartial> | null
  snapshotData: PropsOf<SurveySnapshot> | null
}

export interface SurveyPublicationListResponse {
  publications: SurveyPublication[]
  publicationCount: number
}

export class SurveyPublicationApi extends Api {
  async publish(
    surveyId: string,
    label?: string | null,
    notes?: string | null,
    snapshotLabel?: string | null,
    snapshotNotes?: string | null,
    forceNewSnapshot?: boolean,
  ): Promise<SurveyPublicationResponse> {
    try {
      return await this.getClient().post<SurveyPublicationResponse>(
        `/survey-publication/${surveyId}/publish`,
        { label, notes, snapshotLabel, snapshotNotes, forceNewSnapshot },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async republish(
    surveyId: string,
    snapshotId: string,
    label?: string | null,
    notes?: string | null,
  ): Promise<SurveyPublicationResponse> {
    try {
      return await this.getClient().post<SurveyPublicationResponse>(
        `/survey-publication/${surveyId}/republish`,
        { snapshotId, label, notes },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async unpublish(surveyId: string): Promise<void> {
    try {
      await this.getClient().post(
        `/survey-publication/${surveyId}/unpublish`,
        {},
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async hasUnpublishedChanges(
    surveyId: string,
  ): Promise<{ hasChanges: boolean }> {
    try {
      return await this.getClient().get<{ hasChanges: boolean }>(
        `/survey-publication/${surveyId}/has-unpublished-changes`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async getPublished(
    surveyId: string,
    withData = false,
  ): Promise<SurveyPublicationPublishedResponse> {
    try {
      return await this.getClient().get<SurveyPublicationPublishedResponse>(
        `/survey-publication/${surveyId}/published`,
        {
          params: { withData },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async getList(
    surveyId: string,
    page: number = 1,
    perPage: number = 10,
  ): Promise<SurveyPublicationListResponse> {
    try {
      return await this.getClient().get<SurveyPublicationListResponse>(
        `/survey-publication/${surveyId}/list`,
        {
          params: { page, perPage },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async get(
    surveyId: string,
    publicationId: string,
  ): Promise<{ publication: PropsOf<SurveyPublication> }> {
    try {
      return await this.getClient().get<{
        publication: PropsOf<SurveyPublication>
      }>(`/survey-publication/${surveyId}/publication/${publicationId}`)
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async update(
    surveyId: string,
    publicationId: string,
    data: { label?: string | null; notes?: string | null },
  ): Promise<{ publication: PropsOf<SurveyPublication> }> {
    try {
      return await this.getClient().patch<{
        publication: PropsOf<SurveyPublication>
      }>(`/survey-publication/${surveyId}/publication/${publicationId}`, data)
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async deleteMany(surveyId: string, publicationIds: string[]): Promise<void> {
    try {
      await this.getClient().post(
        `/survey-publication/${surveyId}/delete-many`,
        {
          publicationIds,
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async mergeResponses(
    surveyId: string,
    targetPublicationId: string,
    sourcePublicationId: string,
    options?: MergeOptions,
  ): Promise<MergeResult> {
    try {
      return await this.getClient().post<MergeResult>(
        `/survey-publication/${surveyId}/${targetPublicationId}/merge-from/${sourcePublicationId}`,
        { options },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
