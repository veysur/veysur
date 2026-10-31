import { genUniqueId } from '@datacapy/id'

import { Survey } from './Survey'
import { SurveyPublication } from './SurveyPublication'
import { Infer } from '@datacapy/schema'
import { surveySnapshotPartialShape } from '../schema/SchemaSurveySnapshotPartial'

export class SurveySnapshotPartial {
  surveyPartial: Survey // not inferred: the Survey schema is not typed yet
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
    this.updatedAt = new Date(data?.updatedAt || Date.now())
    this.publications =
      data?.publications?.map((pub) => new SurveyPublication(pub)) || undefined
    this.responseCount = data?.responseCount
  }
}

export interface SurveySnapshotPartial extends Omit<
  Infer<typeof surveySnapshotPartialShape>,
  'surveyPartial'
> {}
