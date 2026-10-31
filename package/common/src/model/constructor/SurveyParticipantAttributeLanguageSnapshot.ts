import { genUniqueId } from '@datacapy/id'
import { Infer } from '@datacapy/schema'
import { surveyParticipantAttributeLanguageSnapshotShape } from '../schema/SchemaSurveyParticipantAttributeLanguageSnapshot'

export class SurveyParticipantAttributeLanguageSnapshot {
  constructor(data?) {
    this._id = data?._id || genUniqueId()
    this.snapshotId = data?.snapshotId
    this.surveyId = data?.surveyId
    this.languageCode = data?.languageCode
    this.data = data?.data ?? {}
    this.contentHash = data?.contentHash
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.updatedAt && new Date(data.updatedAt)) || new Date()
  }
}

export interface SurveyParticipantAttributeLanguageSnapshot extends Infer<
  typeof surveyParticipantAttributeLanguageSnapshotShape
> {}

export default SurveyParticipantAttributeLanguageSnapshot
