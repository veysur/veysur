import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import { SchemaSurveyParticipantAttributeLanguage } from './SurveyParticipantAttributeLanguage.schema'

export interface SurveyParticipantAttributeLanguageData {
  label?: string
  description?: string
}

type InternalId = string & t.MaxLength<17>

/** @schema surveyParticipantAttributeLanguage construct=SurveyParticipantAttributeLanguage strict */
export interface SurveyParticipantAttributeLanguageFields {
  _id: InternalId & t.Required & t.InitFn<'genUniqueId'>
  surveyId: InternalId & t.Required
  languageCode: string & t.Required & t.MaxLength<2>
  data: Record<string, SurveyParticipantAttributeLanguageData> & t.Default<t.EmptyObject> & t.NonStrict & t.Opaque
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}

/** Fields come from the generated {@link SchemaSurveyParticipantAttributeLanguage}. */
export class SurveyParticipantAttributeLanguage extends SchemaConstructor.from(
  SchemaSurveyParticipantAttributeLanguage,
) {
  update(
    data: Partial<SurveyParticipantAttributeLanguage>,
  ): SurveyParticipantAttributeLanguage {
    return new SurveyParticipantAttributeLanguage({ ...this, ...data })
  }
}

export default SurveyParticipantAttributeLanguage
