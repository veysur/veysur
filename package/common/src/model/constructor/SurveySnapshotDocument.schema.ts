// Generated from SurveySnapshotDocument.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema, SpecFor } from '@datacapy/schema'
import type { SurveySnapshotDocument } from './SurveySnapshotDocument'
import { SchemaSurvey } from './SurveyDocument.schema'
import type { SurveyDocument } from './SurveyDocument'

export class SchemaSurveySnapshot extends Schema.from(
  sb
    .schema('surveySnapshot')
    .construct('SurveySnapshot')
    .strict()
    .shape({
      _id: sb.string().required().maxLength(17),
      snapshotId: sb.string().required().maxLength(17),
      survey: sb.refTo<SpecFor<SurveyDocument>>(
        (): unknown => new SchemaSurvey(),
      ),
    }),
) {}

const _checkSchemaSurveySnapshot: AssertSchema<
  SchemaSurveySnapshot,
  SurveySnapshotDocument
> = true
void _checkSchemaSurveySnapshot
