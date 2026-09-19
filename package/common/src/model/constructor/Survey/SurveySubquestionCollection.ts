import { CodeGenerator } from 'util/CodeGenerator'

import { SurveySubquestion, SurveySubquestionData } from './SurveySubquestion'
import { EntityCollection } from '../EntityCollection'

export const SUBQUESTION_CODE_PREFIX = 'S'

export class SurveySubquestionCollection extends EntityCollection<SurveySubquestion> {
  // Hydrates a collection from stored/serialized data. Unlike add(), this
  // does not enforce code uniqueness — the data may already exist (and, in
  // principle, already contain duplicates), so construction must not throw;
  // any duplicates present are surfaced separately via SurveyValidation.
  fromArray(
    data: Partial<SurveySubquestionData>[],
  ): SurveySubquestionCollection {
    let collection = new SurveySubquestionCollection()
    data.forEach((item) => {
      const code = item.code || collection.getNextCode()
      const newQuestion = new SurveySubquestion(
        collection.buildEntityInit(code, item),
      )
      collection = new SurveySubquestionCollection(...collection, newQuestion)
    })
    return collection
  }

  getNextCode(prefix?: string): string {
    const existingCodes = this.map((question) => question.code)
    return CodeGenerator.getNextCode(
      prefix || SUBQUESTION_CODE_PREFIX,
      existingCodes,
    )
  }

  private buildEntityInit(
    code: string,
    init: Partial<SurveySubquestionData>,
    options?: { lang?: string },
  ): Partial<SurveySubquestionData> {
    return {
      type: 'text',
      code,
      text: { [options?.lang || 'en']: 'Question ' + code },
      ...init,
    }
  }

  add(
    init: Partial<SurveySubquestionData> = {},
    options?: {
      afterId?: string
      lang?: string
    },
  ): SurveySubquestionCollection {
    const code = init.code || this.getNextCode()

    if (this.some((subquestion) => subquestion.code === code)) {
      throw new Error(`Subquestion with code "${code}" already exists`)
    }

    const newQuestion = new SurveySubquestion(
      this.buildEntityInit(code, init, options),
    )

    if (options?.afterId) {
      const afterIndex = this.findIndex(
        (question) => question._id === options.afterId,
      )
      if (afterIndex !== -1) {
        this.splice(afterIndex + 1, 0, newQuestion)
        return new SurveySubquestionCollection(...this)
      }
    }

    // If afterId is not provided or not found, add to the end
    this.push(newQuestion)
    return new SurveySubquestionCollection(...this)
  }

  getByCode(code: string): SurveySubquestion | undefined {
    return this.find((subquestion) => subquestion.code === code)
  }

  move(subquestionId: string, newIndex: number): SurveySubquestionCollection {
    const oldIndex = this.findIndex(
      (subquestion) => subquestion._id === subquestionId,
    )
    if (oldIndex === -1) return this

    const [subquestion] = this.splice(oldIndex, 1)
    const updatedSubquestion = new SurveySubquestion({
      ...subquestion,
    })
    this.splice(newIndex, 0, updatedSubquestion)
    return new SurveySubquestionCollection(...this)
  }
}
