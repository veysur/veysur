import { SchemaConstructor } from '@datacapy/schema'
import { SchemaSurveyParticipantAttributeLanguage } from '../schema/SchemaSurveyParticipantAttributeLanguage'

export interface SurveyParticipantAttributeLanguageData {
  label?: string
  description?: string
}

/** Fields come from {@link SchemaSurveyParticipantAttributeLanguage}. */
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
