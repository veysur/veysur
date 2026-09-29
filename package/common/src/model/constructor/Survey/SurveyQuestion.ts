import { PropsOf } from '@datacapy/schema'

import { L10n, setL10nField } from '../L10n'
import { SurveyElementBase, SurveyElementBaseData } from './SurveyElementBase'
import { SurveySubquestionCollection } from './SurveySubquestionCollection'
import { SurveySubquestion, SurveySubquestionData } from './SurveySubquestion'
import {
  SurveyAnswerOption,
  SurveyAnswerOptionData,
} from './SurveyAnswerOption'
import { SurveyAnswerOptionCollection } from './SurveyAnswerOptionCollection'
import type { SurveyAttributes } from './attributeMeta'

const questionAttributesDefault: SurveyAttributes = {
  required: 1,
}

export const ELEMENT_KIND_QUESTION = 'question'

export interface SurveyQuestionData extends SurveyElementBaseData {
  kind: typeof ELEMENT_KIND_QUESTION
  detail: PropsOf<L10n> | null
  subquestions:
    SurveySubquestionCollection | Array<Partial<SurveySubquestionData>>
  answerOptions:
    SurveyAnswerOptionCollection | Partial<PropsOf<SurveyAnswerOption>>[]
}

export class SurveyQuestion extends SurveyElementBase {
  kind: typeof ELEMENT_KIND_QUESTION = ELEMENT_KIND_QUESTION
  detail: L10n | null
  subquestions?: SurveySubquestionCollection
  answerOptions?: SurveyAnswerOptionCollection

  constructor(data: Partial<SurveyQuestionData> = {}) {
    super(data)
    this.kind = ELEMENT_KIND_QUESTION
    this.detail = (data?.detail && new L10n(data?.detail)) || null
    this.attributes = {
      ...questionAttributesDefault,
      ...data.attributes,
    }

    data.subquestions = data.subquestions || []
    this.subquestions = new SurveySubquestionCollection().fromArray(
      data.subquestions,
    )

    // Smart answerOptions handling: reuse collection instance or process array
    if (data?.answerOptions instanceof SurveyAnswerOptionCollection) {
      this.answerOptions = data.answerOptions
    } else {
      data.answerOptions = data.answerOptions
        ? data.answerOptions.map((answer) => {
            answer.createdById = answer.createdById || this.createdById
            return answer
          })
        : []
      this.answerOptions = new SurveyAnswerOptionCollection().fromArray(
        data.answerOptions,
      )
    }
  }

  updateDetail(
    newDetail: string,
    language: string = 'en',
    defaultLanguage?: string,
  ): SurveyQuestion {
    return this.withChanges({
      detail: setL10nField(this.detail, newDetail, language, defaultLanguage),
    })
  }

  deleteDetail(): SurveyQuestion {
    return this.withChanges({ detail: null })
  }

  addSubquestion(
    init: Partial<SurveySubquestionData> = {},
    afterId?: string,
  ): SurveyQuestion {
    this.subquestions = this.subquestions.add({ ...init }, { afterId })
    return new SurveyQuestion({ ...this })
  }

  mutateSubquestion(
    subquestionId: string,
    mutator: (subquestion: SurveySubquestion) => SurveySubquestion,
  ): SurveyQuestion {
    this.subquestions = this.subquestions.mutateById(subquestionId, mutator)
    return new SurveyQuestion({ ...this })
  }

  updateSubquestion(
    subquestionId: string,
    data: Partial<SurveySubquestionData>,
  ): SurveyQuestion {
    this.subquestions = this.subquestions.updateById(
      subquestionId,
      new SurveySubquestion({
        ...this.subquestions.getById(subquestionId),
        ...data,
      }),
    )
    return new SurveyQuestion({ ...this })
  }

  moveSubquestion(questionId: string, newIndex: number): SurveyQuestion {
    this.subquestions = this.subquestions.move(questionId, newIndex)
    return new SurveyQuestion({ ...this })
  }

  deleteSubquestion(questionId: string): SurveyQuestion {
    this.subquestions = this.subquestions.deleteById(questionId)
    return new SurveyQuestion({ ...this })
  }

  addAnswerOption(
    init: Partial<SurveyAnswerOptionData> = {},
    afterId?: string,
  ): SurveyQuestion {
    this.answerOptions = this.answerOptions.add(init, { afterId })
    return new SurveyQuestion({ ...this })
  }

  mutateAnswerOption(
    answerId: string,
    mutator: (answer: SurveyAnswerOption) => SurveyAnswerOption,
  ): SurveyQuestion {
    this.answerOptions = this.answerOptions.mutateById(answerId, mutator)
    return new SurveyQuestion({ ...this })
  }

  updateAnswerOption(
    answerId: string,
    data: Partial<SurveyAnswerOptionData>,
  ): SurveyQuestion {
    this.answerOptions = this.answerOptions.mutateById(answerId, (existing) =>
      existing.update(data),
    )
    return new SurveyQuestion({ ...this })
  }

  moveAnswerOption(answerId: string, newIndex: number): SurveyQuestion {
    this.answerOptions = this.answerOptions.move(answerId, newIndex)
    return new SurveyQuestion({ ...this })
  }

  deleteAnswerOption(answerId: string): SurveyQuestion {
    this.answerOptions = this.answerOptions.deleteById(answerId)
    return new SurveyQuestion({ ...this })
  }
}

/**
 * Type guard: narrows a survey element (or any `{ kind }`-bearing value) to
 * `SurveyQuestion`. Canonical discriminator — prefer over ad-hoc
 * `x.kind === ELEMENT_KIND_QUESTION` checks so a future kind rename is a single edit.
 * Note elements hydrated from legacy data may have `kind` absent; those default to
 * questions, so this guard treats a missing `kind` as a question.
 */
export const isSurveyQuestion = (
  el: { kind?: string } | null | undefined,
): el is SurveyQuestion =>
  el != null && (el.kind === ELEMENT_KIND_QUESTION || el.kind === undefined)
