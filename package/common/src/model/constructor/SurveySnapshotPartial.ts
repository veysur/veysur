import { genUniqueId } from 'mzen-id'

import { Survey } from './Survey'
import { SurveyPublication } from './SurveyPublication'

export class SurveySnapshotPartial {
  _id: string
  surveyId: string
  createdById: string
  contentHash: string // SHA-256 hash of normalized survey content
  label: string | null // Snapshot content description
  notes: string | null // Technical notes about snapshot
  surveyPartial: Survey
  createdAt: Date
  updatedAt: Date
  publications?: SurveyPublication[] // Populated relation
  responseCount?: number // Populated relation - count of responses

  constructor(data) {
    this._id = data?._id || genUniqueId()
    this.surveyId = data?.surveyId
    this.createdById = data?.createdById
    this.contentHash = data?.contentHash
    this.label = data?.label || null
    this.notes = data?.notes || null
    this.surveyPartial = data?.surveyPartial && new Survey(data.surveyPartial)
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.createdAt && new Date(data.updatedAt)) || new Date()
    this.publications =
      data?.publications?.map((pub) => new SurveyPublication(pub)) || undefined
    this.responseCount = data?.responseCount
  }
}
