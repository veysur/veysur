import { SchemaConstructor } from '@datacapy/schema'

import { setL10nField } from '../L10n'
import { SchemaSurveyElementBase } from '../../schema/SchemaSurveyElement'
import { immutableEntity } from './ImmutableEntity'
import { entityConditionMethods } from './mixin/entityConditionMethods'
import { entityAttributeMethods } from './mixin/entityAttributeMethods'

/** Fields come from {@link SchemaSurveyElementBase}. */
class SurveyElementCore extends immutableEntity(
  SchemaConstructor.from(SchemaSurveyElementBase),
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

  updateSectionId(newSectionId: string): this {
    return this.withChanges({ sectionId: newSectionId })
  }
}

/**
 * Shared immutable base for `SurveyQuestion` and `SurveyContent` — the common
 * element fields, `updateText` / `updateSectionId`, plus `updateCondition` /
 * `clearCondition` / `setAttribute` / `deleteAttribute` from the entity mixins.
 *
 * `SurveyQuestion` adds `detail`, `answerOptions`, `subquestions`;
 * `SurveyContent` adds `config`.
 */
export class SurveyElementBase extends entityConditionMethods(
  entityAttributeMethods(SurveyElementCore),
) {}

/** The raw data an element is built from. */
export type SurveyElementBaseData = NonNullable<
  ConstructorParameters<typeof SurveyElementBase>[0]
>
