import { genUniqueId } from '@datacapy/id'
import { Infer, PropsOf } from '@datacapy/schema'
import { emailTemplateShape } from '../schema/SchemaEmailTemplate'

export class EmailTemplate {
  constructor(data: Partial<PropsOf<EmailTemplate>>) {
    this._id = data?._id || genUniqueId()
    this.surveyId = data?.surveyId || null
    this.type = data?.type
    this.lang = data?.lang
    this.subject = data?.subject
    this.body = data?.body
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.updatedAt && new Date(data.updatedAt)) || new Date()
  }
}

export interface EmailTemplate extends Infer<typeof emailTemplateShape> {}
