import { genUniqueId } from '@datacapy/id'

export interface SurveyParticipantAttributeLanguageData {
  label?: string
  description?: string
}

export class SurveyParticipantAttributeLanguage {
  _id: string
  surveyId: string
  languageCode: string
  data: Record<string, SurveyParticipantAttributeLanguageData>
  createdAt: Date
  updatedAt: Date

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

export default SurveyParticipantAttributeLanguage
