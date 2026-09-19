import { genUniqueId } from 'mzen-id'

import { SurveyLanguageData } from './SurveyLanguage'

export class SurveyLanguageSnapshot {
  _id: string
  snapshotId: string
  surveyId: string
  languageCode: string
  contentHash: string
  data: SurveyLanguageData
  createdAt: Date
  updatedAt: Date

  constructor(data?) {
    this._id = data?._id || genUniqueId()
    this.snapshotId = data?.snapshotId
    this.surveyId = data?.surveyId
    this.languageCode = data?.languageCode
    this.contentHash = data?.contentHash
    this.data = data?.data ?? {}
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.updatedAt && new Date(data.updatedAt)) || new Date()
  }
}

export default SurveyLanguageSnapshot
