import {
  SurveyAnswerOption,
  SurveyAnswerOptionData,
} from '../SurveyAnswerOption'
import { SurveyBase } from '../SurveyBase'
import { Constructor } from '../../../type'
import { HasUpdateElementCollection } from './SurveyCoreMethods'

export function AnswerOptionMethods<
  T extends Constructor<SurveyBase & HasUpdateElementCollection>,
>(Base: T) {
  return class extends Base {
    addAnswerOption(
      questionId: string,
      init: Partial<SurveyAnswerOptionData> = {},
      afterId?: string,
    ): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => {
          return question.addAnswerOption(init, afterId)
        },
      )
      return this.newInstance(
        newQuestions === this.elements ? {} : { elements: newQuestions },
      )
    }

    mutateAnswerOption(
      questionId: string,
      answerId: string,
      mutator: (answer: SurveyAnswerOption) => SurveyAnswerOption,
    ): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => {
          return question.mutateAnswerOption(answerId, mutator)
        },
      )
      return this.updateElementCollection(this.elements, newQuestions)
    }

    updateAnswerOption(
      questionId: string,
      answerId: string,
      data: Partial<SurveyAnswerOptionData>,
    ): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => {
          return question.updateAnswerOption(answerId, data)
        },
      )
      return this.updateElementCollection(this.elements, newQuestions)
    }

    updateAnswerOptionLabel(
      questionId: string,
      answerId: string,
      data: Partial<SurveyAnswerOptionData>,
    ): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => {
          return question.updateAnswerOption(answerId, data)
        },
      )
      return this.updateElementCollection(this.elements, newQuestions)
    }

    moveAnswerOption(
      questionId: string,
      answerId: string,
      newIndex: number,
    ): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => {
          return question.moveAnswerOption(answerId, newIndex)
        },
      )
      return this.updateElementCollection(this.elements, newQuestions)
    }

    deleteAnswerOption(questionId: string, answerId: string): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => {
          return question.deleteAnswerOption(answerId)
        },
      )
      return this.updateElementCollection(this.elements, newQuestions)
    }
  }
}
