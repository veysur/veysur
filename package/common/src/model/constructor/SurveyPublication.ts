import { genUniqueId } from 'mzen-id'

export class SurveyPublication {
  _id: string
  snapshotId: string
  surveyId: string
  publishedById: string
  label: string | null // Snapshot content description
  notes: string | null // Technical notes about snapshot
  publishedAt: Date | null
  stoppedAt: Date | null
  createdAt: Date
  updatedAt: Date
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
    this.updatedAt = (data?.createdAt && new Date(data.updatedAt)) || new Date()
    this.responseCount = data?.responseCount
  }
}
