import { genUniqueId } from '@datacapy/id'
import { Infer } from '@datacapy/schema'
import { surveyParticipantAttributeLanguageShape } from '../schema/SchemaSurveyParticipantAttributeLanguage'

export interface SurveyParticipantAttributeLanguageData {
  label?: string
  description?: string
}

export class SurveyParticipantAttributeLanguage {
  constructor(data?) {
    this._id = data?._id || genUniqueId()
    this.surveyId = data?.surveyId
    this.languageCode = data?.languageCode
    this.data = data?.data ?? {}
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.updatedAt && new Date(data.updatedAt)) || new Date()
  }

  update(
    data: Partial<SurveyParticipantAttributeLanguage>,
  ): SurveyParticipantAttributeLanguage {
    return new SurveyParticipantAttributeLanguage({ ...this, ...data })
  }
}

export interface SurveyParticipantAttributeLanguage extends Infer<
  typeof surveyParticipantAttributeLanguageShape
> {}

export default SurveyParticipantAttributeLanguage
