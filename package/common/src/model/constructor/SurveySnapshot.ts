import { genUniqueId } from '@datacapy/id'

import { Survey } from './Survey'

export class SurveySnapshot {
  _id: string
  snapshotId: string
  survey: Survey

  constructor(data) {
    this._id = data?._id || genUniqueId()
    this.snapshotId = data?.snapshotId
    this.survey = data?.survey && new Survey(data.survey)
  }
}
