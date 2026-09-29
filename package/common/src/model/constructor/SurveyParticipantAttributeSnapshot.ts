import { genUniqueId } from '@datacapy/id'
import { SurveyParticipantAttributeDefinition } from './SurveyParticipantAttribute'

export class SurveyParticipantAttributeSnapshot {
  _id: string
  snapshotId: string
  surveyId: string
  attributes: SurveyParticipantAttributeDefinition[]
  contentHash: string
  createdAt: Date
  updatedAt: Date

  constructor(data?) {
    this._id = data?._id || genUniqueId()
    this.snapshotId = data?.snapshotId
    this.surveyId = data?.surveyId
    this.attributes = data?.attributes ?? []
    this.contentHash = data?.contentHash
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.updatedAt && new Date(data.updatedAt)) || new Date()
  }
}

export default SurveyParticipantAttributeSnapshot
