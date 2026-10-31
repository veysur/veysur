import { genUniqueId } from '@datacapy/id'
import { Infer } from '@datacapy/schema'
import { surveyParticipantAttributeShape } from '../schema/SchemaSurveyParticipantAttribute'

export interface SurveyParticipantAttributeDefinition {
  name: string
  required: boolean
  internal: boolean
  example: string | null
}

export class SurveyParticipantAttribute {
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

export interface SurveyParticipantAttribute extends Infer<
  typeof surveyParticipantAttributeShape
> {}

export default SurveyParticipantAttribute
