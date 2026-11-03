import { Infer, PropsOf, SchemaBuilder as sb } from '@datacapy/schema'

import { L10n, setL10nField } from '../L10n'
import { surveySubquestionSpec } from '../../schema/SchemaSurveySubquestion'
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

const fillDefaults = sb.defaultsFor(surveySubquestionSpec)

/** Fields come from {@link surveySubquestionSpec}. */
interface SurveySubquestionCore extends Infer<typeof surveySubquestionSpec> {}

class SurveySubquestionCore extends ImmutableEntity {
  constructor(data: Partial<SurveySubquestionData> = {}) {
    super()
    fillDefaults(data, this)
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

export class SurveySubquestion extends entityAttributeMethods(
  SurveySubquestionCore,
) {}
