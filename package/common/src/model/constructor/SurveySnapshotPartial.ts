import { SchemaConstructor } from '@datacapy/schema'

import { SchemaSurveySnapshotPartial } from '../schema/SchemaSurveySnapshotPartial'

/** Fields come from {@link SchemaSurveySnapshotPartial}. */
export class SurveySnapshotPartial extends SchemaConstructor.from(
  SchemaSurveySnapshotPartial,
) {}
