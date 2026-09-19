import { SurveySubquestion, SurveySubquestionData } from '../SurveySubquestion'
import { SurveyBase } from '../SurveyBase'
import { Constructor } from '../../../type'

export function SubquestionMethods<T extends Constructor<SurveyBase>>(Base: T) {
  return class extends Base {
    addSubquestion(
      questionId: string,
      init: Partial<SurveySubquestionData> = {},
      afterId?: string,
    ): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => question.addSubquestion(init, afterId),
      )
      return this.newInstance(
        newQuestions === this.elements ? {} : { elements: newQuestions },
      )
    }

    mutateSubquestion(
      questionId: string,
      subquestionId: string,
      mutator: (subquestion: SurveySubquestion) => SurveySubquestion,
    ): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => question.mutateSubquestion(subquestionId, mutator),
      )
      return this.newInstance(
        newQuestions === this.elements ? {} : { elements: newQuestions },
      )
    }

    updateSubquestion(
      questionId: string,
      subquestionId: string,
      data: Partial<SurveySubquestionData>,
    ): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => question.updateSubquestion(subquestionId, data),
      )
      return this.newInstance(
        newQuestions === this.elements ? {} : { elements: newQuestions },
      )
    }

    moveSubquestion(
      questionId: string,
      subquestionId: string,
      newIndex: number,
    ): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => question.moveSubquestion(subquestionId, newIndex),
      )
      return this.newInstance(
        newQuestions === this.elements ? {} : { elements: newQuestions },
      )
    }

    deleteSubquestion(questionId: string, subquestionId: string): this {
      const newQuestions = this.elements.mutateQuestionById(
        questionId,
        (question) => question.deleteSubquestion(subquestionId),
      )
      return this.newInstance(
        newQuestions === this.elements ? {} : { elements: newQuestions },
      )
    }
  }
}
