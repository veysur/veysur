import { SurveyQuestion, SurveyQuestionData } from '../SurveyQuestion'
import {
  getDefaultAttributesForType,
  transitionAttributes,
} from '../attributeHelpers'
import {
  AttributeValue,
  QUESTION_TYPE_TEXT,
  SurveyAttributes,
} from '../attributeMeta'
import { SurveyBase } from '../SurveyBase'
import { Constructor } from '../../../type'
import { HasUpdateElementCollection } from './SurveyCoreMethods'
import {
  buildPointScaleAnswerOptions,
  getPointScaleCount,
} from '../questionType/pointScale'

export function QuestionMethods<
  T extends Constructor<SurveyBase & HasUpdateElementCollection>,
>(Base: T) {
  return class extends Base {
    addQuestion(
      sectionId: string,
      init: Partial<SurveyQuestionData> = {},
      options?: {
        afterId?: string
        lang?: string
      },
    ): this {
      const { afterId, lang } = options || {}

      // Initialize with default attributes for the question type
      const questionType = init.type || QUESTION_TYPE_TEXT
      const defaultAttributes = getDefaultAttributesForType(questionType)
      const createdById = init.createdById || this.createdById

      const pointScaleCount = getPointScaleCount(questionType)
      const answerOptions =
        init.answerOptions ??
        (pointScaleCount
          ? buildPointScaleAnswerOptions(pointScaleCount, createdById)
          : undefined)

      const initWithDefaults = {
        ...init,
        type: questionType,
        surveyId: this._id,
        createdById,
        attributes: {
          ...defaultAttributes,
          ...(init.attributes || {}),
        },
        ...(answerOptions ? { answerOptions } : {}),
      }

      let newQuestions = this.elements.add(initWithDefaults, {
        sectionId,
        afterId,
        lang,
      })
      // Keep the collection (and questionIds) in group order. Without this, a
      // question added to a group that is not the last in the survey - e.g.
      // re-adding into a group whose questions were all deleted - lands at the
      // end of the collection, so its derived `position` sits after questions
      // that render below it and forward-reference validation misfires.
      newQuestions = newQuestions.sortBySectionIds(this.sectionIds)
      const newQuestionIds = newQuestions.map((q) => q._id)
      return this.newInstance({
        elements: newQuestions,
        elementIds: newQuestionIds,
      })
    }

    mutateQuestion(
      questionId: string,
      mutator: (question: SurveyQuestion) => SurveyQuestion,
    ): this {
      const newQuestions = this.elements.mutateQuestionById(questionId, mutator)
      return this.updateElementCollection(this.elements, newQuestions)
    }

    updateQuestion(
      questionId: string,
      data: Partial<SurveyQuestionData>,
    ): this {
      // If type is changing, transition attributes
      if (data.type) {
        const currentQuestion = this.elements.find((q) => q._id === questionId)
        if (currentQuestion && currentQuestion.type !== data.type) {
          const transitionedAttributes = transitionAttributes(
            currentQuestion.attributes || {},
            currentQuestion.type,
            data.type,
          )

          data = {
            ...data,
            attributes: {
              ...transitionedAttributes,
              ...(data.attributes || {}),
            },
          }

          // Regenerate point-scale answer options (P1..PN) fresh whenever the
          // type changes into point5/point10/starRating (or a Multi-Part
          // variant of one) - any answerOptions from the previous type are
          // meaningless here, and labels don't carry across a count/affordance
          // change (e.g. point5 -> point10, or point5 -> starRating).
          const pointScaleCount = getPointScaleCount(data.type)
          if (pointScaleCount && !data.answerOptions) {
            data = {
              ...data,
              answerOptions: buildPointScaleAnswerOptions(
                pointScaleCount,
                currentQuestion.createdById,
              ),
            }
          }
        }
      }

      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => new SurveyQuestion({ ...question, ...data }),
      )
      return this.updateElementCollection(this.elements, newQuestions)
    }

    /**
     * Move Question
     *
     * Moves question to target group and index.
     * Sorts all questions by group order.
     *
     * @param questionId
     * @param targetSectionId
     * @param newIndex
     * @returns
     */
    moveQuestion(
      questionId: string,
      targetSectionId: string,
      newIndex: number,
    ): this {
      let newQuestions = this.elements.move(
        questionId,
        targetSectionId,
        newIndex,
      )
      newQuestions = newQuestions.sortBySectionIds(this.sectionIds)
      const newQuestionIds = [...newQuestions.map((q) => q._id)]
      return this.updateElementCollection(this.elements, newQuestions, {
        elementIds: newQuestionIds,
      })
    }

    deleteQuestion(questionId: string): this {
      const newQuestions = this.elements.deleteById(questionId)
      const newQuestionIds = newQuestions.map((q) => q._id)
      return this.updateElementCollection(this.elements, newQuestions, {
        elementIds: newQuestionIds,
      })
    }

    /**
     * Move Question Up
     *
     * Moves a question up relative to its current position within its group.
     * If the question is already at the top of its group, moves it to the
     * bottom of the previous group (if one exists).
     *
     * @param questionId - The ID of the question to move up
     * @returns New Survey instance with the question moved
     */
    moveQuestionUp(questionId: string): this {
      const question = this.elements.find(
        (question) => question._id === questionId,
      )
      if (!question) return this.newInstance({})

      const questionsInGroup = this.elements.getBySectionId(question.sectionId)
      const currentIndexInGroup = questionsInGroup.findIndex(
        (question) => question._id === questionId,
      )

      if (currentIndexInGroup > 0) {
        // Move up within the same group
        const targetQuestion = questionsInGroup[currentIndexInGroup - 1]
        const targetIndex = this.elements.findIndex(
          (question) => question._id === targetQuestion._id,
        )
        return this.moveQuestion(questionId, question.sectionId, targetIndex)
      } else {
        // Question is at the top of its group, try to move to previous group
        const currentGroupIndex = this.sectionIds.indexOf(question.sectionId)
        if (currentGroupIndex > 0) {
          const previousGroupId = this.sectionIds[currentGroupIndex - 1]
          const previousGroupQuestions =
            this.elements.getBySectionId(previousGroupId)
          return this.moveQuestion(
            questionId,
            previousGroupId,
            previousGroupQuestions.length,
          )
        }
      }

      // Already at the top-most position, no change
      return this.newInstance({})
    }

    /**
     * Move Question Down
     *
     * Moves a question down relative to its current position within its group.
     * If the question is already at the bottom of its group, moves it to the
     * top of the next group (if one exists).
     *
     * @param questionId - The ID of the question to move down
     * @returns New Survey instance with the question moved
     */
    moveQuestionDown(questionId: string): this {
      const question = this.elements.find(
        (question) => question._id === questionId,
      )
      if (!question) return this.newInstance({})

      const questionsInGroup = this.elements.getBySectionId(question.sectionId)
      const currentIndexInGroup = questionsInGroup.findIndex(
        (question) => question._id === questionId,
      )

      if (currentIndexInGroup < questionsInGroup.length - 1) {
        // Move down within the same group
        const targetQuestion = questionsInGroup[currentIndexInGroup + 1]
        const targetIndex = this.elements.findIndex(
          (question) => question._id === targetQuestion._id,
        )
        return this.moveQuestion(questionId, question.sectionId, targetIndex)
      } else {
        // Question is at the bottom of its group, try to move to next group
        const currentGroupIndex = this.sectionIds.indexOf(question.sectionId)
        if (currentGroupIndex < this.sectionIds.length - 1) {
          const nextGroupId = this.sectionIds[currentGroupIndex + 1]
          return this.moveQuestion(questionId, nextGroupId, 0)
        }
      }

      // Already at the bottom-most position, no change
      return this.newInstance({})
    }

    mutateQuestionAttributes(
      questionId: string,
      mutator: (attributes: SurveyAttributes) => SurveyAttributes,
    ): this {
      const newQuestions = this.elements.mutateAttributes(questionId, mutator)
      return this.updateElementCollection(this.elements, newQuestions)
    }

    setQuestionAttribute(
      questionId: string,
      attributeId: string,
      value: AttributeValue,
    ): this {
      const newQuestions = this.elements.setAttribute(
        questionId,
        attributeId,
        value,
      )
      return this.updateElementCollection(this.elements, newQuestions)
    }
  }
}
