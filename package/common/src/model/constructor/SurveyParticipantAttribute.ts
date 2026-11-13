import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import { SchemaSurveyParticipantAttribute } from './SurveyParticipantAttribute.schema'

export interface SurveyParticipantAttributeDefinition {
  name: string
  required: boolean
  internal: boolean
  example: string | null
}

type InternalId = string & t.MaxLength<17>

/** @schema surveyParticipantAttribute construct=SurveyParticipantAttribute strict */
export interface SurveyParticipantAttributeFields {
  _id: InternalId & t.Required & t.InitFn<'genUniqueId'>
  surveyId: InternalId & t.Required
  attributes: SurveyParticipantAttributeDefinition[] & t.Default<t.EmptyArray> & t.Opaque
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}

/** Fields come from the generated {@link SchemaSurveyParticipantAttribute}. */
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
