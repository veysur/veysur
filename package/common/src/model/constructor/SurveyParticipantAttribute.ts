import { SchemaConstructor } from '@datacapy/schema'
import { SchemaSurveyParticipantAttribute } from '../schema/SchemaSurveyParticipantAttribute'

export interface SurveyParticipantAttributeDefinition {
  name: string
  required: boolean
  internal: boolean
  example: string | null
}

/** Fields come from {@link SchemaSurveyParticipantAttribute}. */
export class SurveyParticipantAttribute extends SchemaConstructor.from(
  SchemaSurveyParticipantAttribute,
) {
  update(
    data: Partial<SurveyParticipantAttribute>,
  ): SurveyParticipantAttribute {
    return new SurveyParticipantAttribute({ ...this, ...data })
  }
}

export default SurveyParticipantAttribute
