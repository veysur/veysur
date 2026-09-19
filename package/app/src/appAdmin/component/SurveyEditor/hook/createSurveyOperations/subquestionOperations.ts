import {
  SurveyQuestionData,
  SurveySubquestionData,
  BUFFERED_PATCH_ACTION_UPDATE,
  getDefaultAttributesForSubquestionType,
  getMatrixDefaultSubquestionType,
  getMultiPartDefaultSubquestionType,
  isMultiPartQuestionType,
} from 'veysur-common'

import { OperationDependencies } from './type'
import { l10nFieldPatchValue } from './l10nFieldPatch'
import {
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from '../../constant'

const createPatchQuestionUpdate = (
  questionId: string,
  data: Partial<SurveyQuestionData>,
) => {
  return {
    type: SURVEY_ENTITY_TYPE_ELEMENT,
    action: BUFFERED_PATCH_ACTION_UPDATE,
    id: questionId,
    data,
  }
}

export const createSubquestionOperations = ({
  updateSurveyState,
  validateAndBuffer,
}: OperationDependencies) => ({
  addSubquestion: (questionId: string) =>
    updateSurveyState((s) => {
      const question = s.elements.getQuestionById(questionId)
      const effectiveType = isMultiPartQuestionType(question?.type ?? '')
        ? getMultiPartDefaultSubquestionType(question?.type ?? '')
        : getMatrixDefaultSubquestionType(question?.type ?? '')
      const attributes = getDefaultAttributesForSubquestionType(effectiveType)
      s = s.addSubquestion(questionId, { type: effectiveType, attributes })
      const updatedQuestion = s.elements.getQuestionById(questionId)
      if (updatedQuestion) {
        validateAndBuffer({
          patches: [
            createPatchQuestionUpdate(updatedQuestion._id, {
              subquestions: updatedQuestion.subquestions,
            }),
          ],
        })
      }
      return s
    }),

  updateSubquestion: (
    questionId: string,
    subquestionId: string,
    data: Partial<SurveySubquestionData>,
  ) =>
    updateSurveyState((s) => {
      s = s.updateSubquestion(questionId, subquestionId, data)
      const question = s.elements.getQuestionById(questionId)
      if (question) {
        validateAndBuffer({
          patches: [
            createPatchQuestionUpdate(question._id, {
              subquestions: question.subquestions,
            }),
          ],
        })
      }
      return s
    }),

  updateSubquestionText: (
    questionId: string,
    subquestionId: string,
    text: string,
    lang: string = 'en',
    langDefault?: string,
  ) =>
    updateSurveyState((s) => {
      s = s.mutateSubquestion(questionId, subquestionId, (sq) =>
        sq.updateText(text, lang, langDefault),
      )
      const updatedText = s.elements
        .getQuestionById(questionId)
        ?.subquestions?.getById(subquestionId)?.text
      const patchText = l10nFieldPatchValue(
        updatedText,
        text,
        lang,
        langDefault,
      )
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SUBQUESTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: subquestionId,
            data: { text: patchText },
          },
        ],
      })
      return s
    }),

  setSubquestionAttribute: (
    questionId: string,
    subquestionId: string,
    attributeId: string,
    value: unknown,
  ) =>
    updateSurveyState((s) => {
      s = s.mutateSubquestion(questionId, subquestionId, (sq) =>
        sq.setAttribute(attributeId, value),
      )
      const question = s.elements.getQuestionById(questionId)
      if (question) {
        validateAndBuffer({
          patches: [
            createPatchQuestionUpdate(question._id, {
              subquestions: question.subquestions,
            }),
          ],
        })
      }
      return s
    }),

  deleteSubquestion: (questionId: string, subquestionId: string) =>
    updateSurveyState((s) => {
      s = s.deleteSubquestion(questionId, subquestionId)
      const question = s.elements.getQuestionById(questionId)
      if (question) {
        validateAndBuffer({
          patches: [
            createPatchQuestionUpdate(question._id, {
              subquestions: question.subquestions,
            }),
          ],
        })
      }
      return s
    }),

  moveSubquestion: (
    questionId: string,
    subquestionId: string,
    newIndex: number,
  ) =>
    updateSurveyState((s) => {
      s = s.moveSubquestion(questionId, subquestionId, newIndex)
      const question = s.elements.getQuestionById(questionId)
      if (question) {
        validateAndBuffer({
          patches: [
            createPatchQuestionUpdate(question._id, {
              subquestions: question.subquestions,
            }),
          ],
        })
      }
      return s
    }),
})
