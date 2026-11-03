import { SchemaConstructor } from '@datacapy/schema'
import { SchemaSurveyPublication } from '../schema/SchemaSurveyPublication'

/** Fields come from {@link SchemaSurveyPublication}. */
export class SurveyPublication extends SchemaConstructor.from(
  SchemaSurveyPublication,
) {}
