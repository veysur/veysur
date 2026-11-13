import { genUniqueId } from '@datacapy/id'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'
import { SchemaSurvey } from '../constructor/SurveyDocument.schema'
import { Survey } from '../constructor/Survey'
import { SurveyPublication } from '../constructor/SurveyPublication'

export const surveySnapshotPartialSpec = {
  _id: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
    .init(genUniqueId),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  createdById: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  contentHash: sb.string().required().minLength(64).maxLength(64),
  label: sb.string().default(null),
  notes: sb.string().default(null),
  surveyPartial: sb
    .object()
    .schema(() => new SchemaSurvey())
    .construct(() => Survey)
    .as<Survey>(),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
  // Populated relations: publications of the snapshot and the count of responses
  publications: sb
    .array(
      sb
        .object()
        .construct(() => SurveyPublication)
        .as<SurveyPublication>(),
    )
    .relation(),
  responseCount: sb.number().relation(),
}

export class SchemaSurveySnapshotPartial extends Schema.from(
  sb
    .schema('surveySnapshotPartial')
    .construct('SurveySnapshotPartial')
    .strict()
    .shape(surveySnapshotPartialSpec),
) {}

export default SchemaSurveySnapshotPartial
