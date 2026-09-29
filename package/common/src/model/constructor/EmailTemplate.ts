import { genUniqueId } from '@datacapy/id'
import { PropsOf } from '@datacapy/schema'

export class EmailTemplate {
  _id: string
  surveyId: string | null
  type: string
  lang: string
  subject: string
  body: string
  createdAt: Date
  updatedAt: Date

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
