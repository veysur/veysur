import { genUniqueId } from 'mzen-id'

export interface SurveyParticipantAttributeDefinition {
  name: string
  required: boolean
  internal: boolean
  example: string | null
}

export class SurveyParticipantAttribute {
  _id: string
  surveyId: string
  attributes: SurveyParticipantAttributeDefinition[]
  createdAt: Date
  updatedAt: Date

  constructor(data?) {
    this._id = data?._id || genUniqueId()
    this.surveyId = data?.surveyId
    this.attributes = data?.attributes ?? []
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.updatedAt && new Date(data.updatedAt)) || new Date()
  }

  update(
    data: Partial<SurveyParticipantAttribute>,
  ): SurveyParticipantAttribute {
    return new SurveyParticipantAttribute({ ...this, ...data })
  }
}

export default SurveyParticipantAttribute
