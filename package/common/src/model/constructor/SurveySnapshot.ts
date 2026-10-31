import { genUniqueId } from '@datacapy/id'

import { Survey } from './Survey'
import { Infer } from '@datacapy/schema'
import { surveySnapshotShape } from '../schema/SchemaSurveySnapshot'

export class SurveySnapshot {
  survey: Survey // not inferred: the Survey schema is not typed yet

  constructor(data) {
    this._id = data?._id || genUniqueId()
    this.snapshotId = data?.snapshotId
    this.survey = data?.survey && new Survey(data.survey)
  }
}

export interface SurveySnapshot extends Omit<
  Infer<typeof surveySnapshotShape>,
  'survey'
> {}
