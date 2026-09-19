import { CodeGenerator } from 'util/CodeGenerator'

import { SurveyElementBase } from './SurveyElementBase'
import {
  SurveyQuestion,
  SurveyQuestionData,
  isSurveyQuestion,
} from './SurveyQuestion'
import {
  SurveyContent,
  SurveyContentData,
  CONTENT_CODE_PREFIX,
  isSurveyContent,
} from './SurveyContent'
import { SurveyEntityCollection } from './SurveyEntityCollection'

export const QUESTION_CODE_PREFIX = 'Q'

/** A slot in the ordered element list — a question xor a content element. */
export type SurveyElement = SurveyQuestion | SurveyContent
export type SurveyElementData =
  Partial<SurveyQuestionData> | Partial<SurveyContentData>

const isContentData = (item: SurveyElementData | SurveyElementBase): boolean =>
  isSurveyContent(item)

/**
 * Mixed collection of questions and content elements, ordered by
 * `survey.elementIds`. Elements are typed `SurveyElementBase` (the shared
 * question/content base); `kind` on each item discriminates the concrete class.
 * Use `questions()` / `contents()` — or `getQuestionById` / `getQuestionByCode`
 * — to reach the kind-specific API (`answerOptions`, `subquestions`, `config`).
 */
export class SurveyElementCollection extends SurveyEntityCollection<SurveyElementBase> {
  // Hydrates a collection from stored/serialized data. Unlike add(), this
  // does not enforce code uniqueness — the data may already exist (and, in
  // principle, already contain duplicates), so construction must not throw;
  // any duplicates present are surfaced separately via SurveyValidation.
  fromArray(
    data: Array<SurveyElementData | SurveyElementBase>,
  ): SurveyElementCollection {
    let collection = new SurveyElementCollection()
    data.forEach((item) => {
      if (isContentData(item)) {
        const code = item.code || collection.getNextCode(CONTENT_CODE_PREFIX)
        const element = new SurveyContent({
          ...(item as Partial<SurveyContentData>),
          code,
        })
        collection = new SurveyElementCollection(...collection, element)
        return
      }
      const code = item.code || collection.getNextCode()
      const newQuestion = new SurveyQuestion(
        collection.buildEntityInit(code, item as Partial<SurveyQuestionData>),
      )
      collection = new SurveyElementCollection(...collection, newQuestion)
    })
    return collection
  }

  getNextCode(prefix?: string): string {
    const existingCodes = this.map((entity) => entity.code)
    return CodeGenerator.getNextCode(
      prefix || QUESTION_CODE_PREFIX,
      existingCodes,
    )
  }

  private buildEntityInit(
    code: string,
    init: Partial<SurveyQuestionData>,
    options?: { sectionId?: string; lang?: string },
  ): Partial<SurveyQuestionData> {
    return {
      type: 'text',
      code,
      text: { [options?.lang || 'en']: 'Question ' + code },
      ...init,
      sectionId: init?.sectionId ?? options?.sectionId,
    }
  }

  /** Questions only (excludes content elements). */
  questions(): SurveyElementCollection {
    return new SurveyElementCollection(
      ...this.filter((e) => !isSurveyContent(e)),
    )
  }

  /** Content elements only. */
  contents(): SurveyContent[] {
    return [...this].filter(isSurveyContent)
  }

  /**
   * Questions only, as a plain typed array. Use when the caller reads
   * question-specific fields (`answerOptions`, `subquestions`, `detail`);
   * `questions()` returns a `SurveyElementCollection` for chaining collection ops.
   */
  questionList(): SurveyQuestion[] {
    return [...this].filter(isSurveyQuestion)
  }

  /** A single question by id — `undefined` if absent or if the id is a content element. */
  getQuestionById(id: string): SurveyQuestion | undefined {
    const entity = this.getById(id)
    return isSurveyQuestion(entity) ? entity : undefined
  }

  /** A single question by code — `undefined` if absent or if the code is a content element. */
  getQuestionByCode(code: string): SurveyQuestion | undefined {
    const entity = this.getByCode(code)
    return isSurveyQuestion(entity) ? entity : undefined
  }

  /**
   * Mutate a single question by id. The mutator is skipped (and the collection
   * returned unchanged) if the id is absent or refers to a content element —
   * every question-only operation routes through here so the kind check lives
   * in one place.
   */
  mutateQuestionById(
    id: string,
    mutator: (question: SurveyQuestion) => SurveyQuestion,
  ): SurveyElementCollection {
    return this.mutateById(id, (entity) =>
      isSurveyQuestion(entity) ? mutator(entity) : entity,
    )
  }

  /** As `mutateQuestionById`, but skips ids that are not content elements. */
  mutateContentById(
    id: string,
    mutator: (content: SurveyContent) => SurveyContent,
  ): SurveyElementCollection {
    return this.mutateById(id, (entity) =>
      isSurveyContent(entity) ? mutator(entity) : entity,
    )
  }

  add(
    init: Partial<SurveyQuestionData> = {},
    options?: {
      sectionId?: string
      afterId?: string
      lang?: string
    },
  ): SurveyElementCollection {
    const code = init.code || this.getNextCode()

    if (this.some((entity) => entity.code === code)) {
      throw new Error(`Question with code "${code}" already exists`)
    }

    const newQuestion = new SurveyQuestion(
      this.buildEntityInit(code, init, options),
    )

    if (options?.afterId) {
      const afterIndex = this.findIndex(
        (entity) => entity._id === options.afterId,
      )
      if (afterIndex !== -1) {
        const newCollection = new SurveyElementCollection(...this)
        newCollection.splice(afterIndex + 1, 0, newQuestion)
        return newCollection
      }
    }

    // If afterId is not provided or not found, add to the end
    return new SurveyElementCollection(...this, newQuestion)
  }

  addContent(
    init: Partial<SurveyContentData> = {},
    options?: {
      sectionId?: string
      afterId?: string
      lang?: string
    },
  ): SurveyElementCollection {
    const code = init.code || this.getNextCode(CONTENT_CODE_PREFIX)

    if (this.some((entity) => entity.code === code)) {
      throw new Error(`Content element with code "${code}" already exists`)
    }

    const element = new SurveyContent({
      ...init,
      code,
      sectionId: options?.sectionId ?? init.sectionId,
    })

    if (options?.afterId) {
      const afterIndex = this.findIndex(
        (entity) => entity._id === options.afterId,
      )
      if (afterIndex !== -1) {
        const newCollection = new SurveyElementCollection(...this)
        newCollection.splice(afterIndex + 1, 0, element)
        return newCollection
      }
    }

    return new SurveyElementCollection(...this, element)
  }

  move(
    entityId: string,
    targetSectionId: string,
    newIndex: number,
  ): SurveyElementCollection {
    const oldIndex = this.findIndex((entity) => entity._id === entityId)
    if (oldIndex === -1) return this

    const newCollection = new SurveyElementCollection(...this)
    const [entity] = newCollection.splice(oldIndex, 1)
    const Ctor = entity.constructor as new (
      data: Record<string, unknown>,
    ) => SurveyElementBase
    const updatedEntity = new Ctor({
      ...entity,
      sectionId: targetSectionId || entity.sectionId,
    })
    newIndex =
      newIndex > newCollection.length
        ? newCollection.length
        : newIndex > 0
          ? newIndex
          : 0
    newCollection.splice(newIndex, 0, updatedEntity)
    return newCollection
  }

  getByCode(code: string): SurveyElementBase | undefined {
    return this.find((entity) => entity.code === code)
  }

  getBySectionId(sectionId: string): SurveyElementBase[] {
    return this.filter((entity) => entity.sectionId === sectionId)
  }

  sortBySectionIds(sectionIds: string[]): SurveyElementCollection {
    const sectionIdOrder = new Map(sectionIds.map((id, index) => [id, index]))

    const sorted = [...this].sort((a, b) => {
      const aOrder = sectionIdOrder.get(a.sectionId) ?? Number.MAX_SAFE_INTEGER
      const bOrder = sectionIdOrder.get(b.sectionId) ?? Number.MAX_SAFE_INTEGER
      return aOrder - bOrder
    })

    return new SurveyElementCollection(...sorted)
  }
}
