import { genUniqueId } from '@datacapy/id'
import { SurveyParticipantAttributeLanguageData } from './SurveyParticipantAttributeLanguage'

export class SurveyParticipantAttributeLanguageSnapshot {
  _id: string
  snapshotId: string
  surveyId: string
  languageCode: string
  data: Record<string, SurveyParticipantAttributeLanguageData>
  contentHash: string
  createdAt: Date
  updatedAt: Date

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

export default SurveyParticipantAttributeLanguageSnapshot
