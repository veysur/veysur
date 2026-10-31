import { genUniqueId } from '@datacapy/id'

import { Infer } from '@datacapy/schema'
import { surveyLanguageSnapshotShape } from '../schema/SchemaSurveyLanguageSnapshot'

export class SurveyLanguageSnapshot {
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

export interface SurveyLanguageSnapshot extends Infer<
  typeof surveyLanguageSnapshotShape
> {}

export default SurveyLanguageSnapshot
