import { genUniqueId } from '@datacapy/id'
import { Infer } from '@datacapy/schema'
import { surveyParticipantAttributeSnapshotShape } from '../schema/SchemaSurveyParticipantAttributeSnapshot'

export class SurveyParticipantAttributeSnapshot {
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

export interface SurveyParticipantAttributeSnapshot extends Infer<
  typeof surveyParticipantAttributeSnapshotShape
> {}

export default SurveyParticipantAttributeSnapshot
