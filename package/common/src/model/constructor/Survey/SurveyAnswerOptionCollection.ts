import { CodeGenerator } from 'util/CodeGenerator'

import {
  SurveyAnswerOption,
  SurveyAnswerOptionData,
} from './SurveyAnswerOption'
import { EntityCollection } from '../EntityCollection'

export const ANSWER_CODE_PREFIX = 'A'

export class SurveyAnswerOptionCollection extends EntityCollection<SurveyAnswerOption> {
  // Hydrates a collection from stored/serialized data. Unlike add(), this
  // does not enforce code uniqueness — the data may already exist (and, in
  // principle, already contain duplicates), so construction must not throw;
  // any duplicates present are surfaced separately via SurveyValidation.
  fromArray(
    data: Partial<SurveyAnswerOptionData>[],
  ): SurveyAnswerOptionCollection {
    let collection = new SurveyAnswerOptionCollection()
    data.forEach((item) => {
      const code = item.code || collection.getNextCode()
      const newAnswer = new SurveyAnswerOption(
        collection.buildEntityInit(code, item),
      )
      collection = new SurveyAnswerOptionCollection(...collection, newAnswer)
    })
    return collection
  }

  getNextCode(prefix?: string): string {
    const existingCodes = this.map((answer) => answer.code)
    return CodeGenerator.getNextCode(
      prefix || ANSWER_CODE_PREFIX,
      existingCodes,
    )
  }

  private buildEntityInit(
    code: string,
    init: Partial<SurveyAnswerOptionData>,
  ): Partial<SurveyAnswerOptionData> {
    return {
      code,
      ...init,
    }
  }

  add(
    init: Partial<SurveyAnswerOptionData> = {},
    options?: {
      afterId?: string
    },
  ): SurveyAnswerOptionCollection {
    const code = init.code || this.getNextCode()

    if (this.some((answer) => answer.code === code)) {
      throw new Error(`Answer option with code "${code}" already exists`)
    }

    const newAnswer = new SurveyAnswerOption(this.buildEntityInit(code, init))

    if (options?.afterId) {
      const afterIndex = this.findIndex(
        (answer) => answer._id === options.afterId,
      )
      if (afterIndex !== -1) {
        this.splice(afterIndex + 1, 0, newAnswer)
        return new SurveyAnswerOptionCollection(...this)
      }
    }

    // If afterId is not provided or not found, add to the end
    this.push(newAnswer)
    return new SurveyAnswerOptionCollection(...this)
  }

  getByCode(code: string): SurveyAnswerOption | undefined {
    return this.find((option) => option.code === code)
  }

  move(answerId: string, newIndex: number): SurveyAnswerOptionCollection {
    const oldIndex = this.findIndex((answer) => answer._id === answerId)
    if (oldIndex === -1) return this

    const [answer] = this.splice(oldIndex, 1)
    const updatedAnswer = new SurveyAnswerOption({
      ...answer,
    })
    this.splice(newIndex, 0, updatedAnswer)
    return new SurveyAnswerOptionCollection(...this)
  }
}
