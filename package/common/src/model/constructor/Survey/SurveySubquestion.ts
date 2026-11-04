import { SchemaConstructor } from '@datacapy/schema'

import { setL10nField } from '../L10n'
import { SchemaSurveySubquestion } from '../../schema/SchemaSurveySubquestion'
import { immutableEntity } from './ImmutableEntity'
import { entityAttributeMethods } from './mixin/entityAttributeMethods'

/** Fields come from {@link SchemaSurveySubquestion}. */
class SurveySubquestionCore extends immutableEntity(
  SchemaConstructor.from(SchemaSurveySubquestion),
) {
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

/** The raw data a subquestion is built from. */
export type SurveySubquestionData = NonNullable<
  ConstructorParameters<typeof SurveySubquestion>[0]
>
