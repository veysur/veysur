import { genUniqueId } from 'mzen-id'
import { PropsOf } from 'mzen-schema'

import { L10n, setL10nField } from '../L10n'
import { ImmutableEntity } from './ImmutableEntity'
import { entityConditionMethods } from './mixin/entityConditionMethods'
import { entityAttributeMethods } from './mixin/entityAttributeMethods'
import type { SurveyAttributes } from './attributeMeta'

/**
 * The fields common to every ordered survey element — questions and content
 * elements alike. `kind` / `type` / `attributes` are declared here but each
 * subclass sets its own default in its constructor (question: `type: ''`,
 * `attributes: { required: 1 }`; content: `type: 'contentText'`, `attributes: {}`).
 */
export interface SurveyElementBaseData {
  _id: string
  surveyId: string
  createdById: string
  kind: string
  type: string
  code: string
  text: PropsOf<L10n>
  sectionId: string
  attributes: SurveyAttributes
  condition: string | null
  conditionReferences: string[] | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Common element fields plus the two mutators identical across both kinds
 * (`updateText`, `updateSectionId`). The shared visibility-condition and
 * attribute mutators are layered on by the entity mixins in `SurveyElementBase`.
 */
class SurveyElementCore extends ImmutableEntity {
  _id: string
  surveyId: string
  createdById: string
  kind: string
  type: string
  code: string
  text: L10n
  /** Parent section id. */
  sectionId?: string
  attributes: SurveyAttributes = {}
  condition: string | null
  conditionReferences: string[] | null
  createdAt: Date
  updatedAt: Date

  constructor(data: Partial<SurveyElementBaseData> = {}) {
    super()
    this._id = data?._id || genUniqueId()
    this.surveyId = data?.surveyId
    this.createdById = data?.createdById
    this.kind = data?.kind
    this.type = data?.type || ''
    this.code = data?.code || ''
    this.text = new L10n(data?.text)
    this.sectionId = data?.sectionId
    this.attributes = data?.attributes || {}
    this.condition = data?.condition ?? null
    this.conditionReferences = data?.conditionReferences ?? null
    this.createdAt = new Date(data?.createdAt)
    this.updatedAt = new Date(data?.updatedAt)
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
