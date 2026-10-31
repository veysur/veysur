import { genUniqueId } from '@datacapy/id'
import { Infer } from '@datacapy/schema'
import { surveyPublicationShape } from '../schema/SchemaSurveyPublication'

export class SurveyPublication {
  responseCount?: number // Populated relation - count of responses

  constructor(data) {
    this._id = data?._id || genUniqueId()
    this.snapshotId = data?.snapshotId
    this.surveyId = data?.surveyId
    this.publishedById = data?.publishedById
    this.label = data?.label || null
    this.notes = data?.notes || null
    this.publishedAt =
      (data?.publishedAt && new Date(data.publishedAt)) || new Date()
    this.stoppedAt = (data?.stoppedAt && new Date(data.stoppedAt)) || null
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = new Date(data?.updatedAt || Date.now())
    this.responseCount = data?.responseCount
  }
}

export interface SurveyPublication extends Infer<
  typeof surveyPublicationShape
> {}
