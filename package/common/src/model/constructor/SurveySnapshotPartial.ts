import { Survey } from './Survey'
import { SurveyPublication } from './SurveyPublication'
import { Infer, SchemaBuilder as sb } from '@datacapy/schema'
import { surveySnapshotPartialSpec } from '../schema/SchemaSurveySnapshotPartial'

const fillDefaults = sb.defaultsFor(surveySnapshotPartialSpec)

export class SurveySnapshotPartial {
  surveyPartial: Survey // not inferred: the Survey schema is not typed yet
  publications?: SurveyPublication[] // Populated relation
  responseCount?: number // Populated relation - count of responses

  constructor(data) {
    fillDefaults(data, this)
  }
}

export interface SurveySnapshotPartial extends Omit<
  Infer<typeof surveySnapshotPartialSpec>,
  'surveyPartial' | 'publications' | 'responseCount'
> {}
