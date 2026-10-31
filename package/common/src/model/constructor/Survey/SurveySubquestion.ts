import { genUniqueId } from '@datacapy/id'
import { Infer, PropsOf } from '@datacapy/schema'

import { L10n, setL10nField } from '../L10n'
import { surveySubquestionShape } from '../../schema/SchemaSurveySubquestion'
import { ImmutableEntity } from './ImmutableEntity'
import { entityAttributeMethods } from './mixin/entityAttributeMethods'
import type { SurveyAttributes } from './attributeMeta'

export interface SurveySubquestionData {
  _id: string
  type: string
  code: string
  text: PropsOf<L10n>
  detail: PropsOf<L10n> | null
  attributes: SurveyAttributes
  createdAt: Date
  updatedAt: Date
}

class SurveySubquestionCore extends ImmutableEntity {
  constructor(data: Partial<SurveySubquestionData> = {}) {
    super()
    this._id = data?._id || genUniqueId()
    this.type = data?.type || ''
    this.code = data?.code || ''
    this.text = new L10n(data?.text)
    this.detail = (data?.detail && new L10n(data?.detail)) || null
    this.attributes = data?.attributes || {}
    this.createdAt = new Date(data?.createdAt || Date.now())
    this.updatedAt = new Date(data?.updatedAt || Date.now())
  }

  updateText(
    newText: string,
    language: string = 'en',
    defaultLanguage?: string,
  ): this {
    return this.withChanges({
      text: setL10nField(this.text, newText, language, defaultLanguage),
    })
  }

  updateDetail(
    newDetail: string,
    language: string = 'en',
    defaultLanguage?: string,
  ): this {
    return this.withChanges({
      detail: setL10nField(this.detail, newDetail, language, defaultLanguage),
    })
  }

  deleteDetail(): this {
    return this.withChanges({ detail: null })
  }
}

interface SurveySubquestionCore extends Infer<typeof surveySubquestionShape> {}

export class SurveySubquestion extends entityAttributeMethods(
  SurveySubquestionCore,
) {}
