import {
  SurveySubquestion,
  L10n,
  BUFFERED_PATCH_ACTION_UPDATE,
} from 'veysur-common'

import { OperationDependencies } from './type'
import { SURVEY_ENTITY_TYPE_ELEMENT } from '../../constant'

export const createMatrixOperations = ({
  updateSurveyState,
  validateAndBuffer,
}: OperationDependencies) => ({
  swapMatrixAxisText: (questionId: string) =>
    updateSurveyState((s) => {
      const question = s.elements.getQuestionById(questionId)
      if (!question) return s

      const subquestions = question.subquestions ?? []
      const answerOptions = question.answerOptions ?? []
      if (subquestions.length === 0 || answerOptions.length === 0) return s
      const maxCount = Math.max(subquestions.length, answerOptions.length)

      const subquestionIds = subquestions.map((sq) => sq._id)
      const originalSubquestionText = subquestions.map((sq) => sq.text)
      const answerOptionIds = answerOptions.map((ao) => ao._id)
      const originalAnswerOptionLabel = answerOptions.map((ao) => ao.label)
      const emptyL10n = new L10n()

      for (let i = 0; i < maxCount; i++) {
        if (i < subquestionIds.length) {
          const newSubquestionText =
            i < originalAnswerOptionLabel.length
              ? originalAnswerOptionLabel[i]
              : emptyL10n
          s = s.mutateSubquestion(
            questionId,
            subquestionIds[i],
            (sq) => new SurveySubquestion({ ...sq, text: newSubquestionText }),
          )
        }
        if (i < answerOptionIds.length) {
          const newAnswerOptionLabel =
            i < originalSubquestionText.length
              ? originalSubquestionText[i]
              : emptyL10n
          s = s.mutateAnswerOption(questionId, answerOptionIds[i], (ao) =>
            ao.update({ label: newAnswerOptionLabel }),
          )
        }
      }

      const updatedQuestion = s.elements.getQuestionById(questionId)
      if (updatedQuestion) {
        validateAndBuffer({
          patches: [
            {
              type: SURVEY_ENTITY_TYPE_ELEMENT,
              action: BUFFERED_PATCH_ACTION_UPDATE,
              id: questionId,
              data: {
                subquestions: updatedQuestion.subquestions,
                answerOptions: updatedQuestion.answerOptions,
              },
            },
          ],
        })
      }
      return s
    }),
})
