import {
  Survey,
  SurveyQuestion,
  SurveySubquestion,
  SurveyAttributes,
  BUFFERED_PATCH_ACTION_CREATE,
  BUFFERED_PATCH_ACTION_UPDATE,
  BUFFERED_PATCH_ACTION_DELETE,
  PatchData,
  schemaManager,
  getMatrixTypeConfig,
  getMultiPartTypeConfig,
  transitionSubquestionAttributes,
} from 'veysur-common'

import { OperationDependencies } from './type'
import { l10nFieldPatchValue } from './l10nFieldPatch'
import {
  SURVEY_ENTITY_TYPE_SURVEY,
  SURVEY_ENTITY_TYPE_ELEMENT,
} from '../../constant'

const questionSchema = schemaManager.getSchema('surveyElement')
const l10nHtmlSchema = schemaManager.getSchema('l10nHtml')

export const createQuestionOperations = ({
  updateSurveyState,
  validateAndBuffer,
  setSurveyFocus,
}: OperationDependencies) => ({
  addQuestion: (
    sectionId: string,
    options?: {
      afterId?: string
      lang?: string
      type?: string
      attributes?: SurveyAttributes
    },
  ) => {
    const id = Survey.genElementId()
    updateSurveyState((s) => {
      const { afterId, lang, type, attributes } = options || {}
      const init: {
        _id: string
        type?: string
        attributes?: SurveyAttributes
      } = {
        _id: id,
      }
      if (type) init.type = type
      if (attributes) init.attributes = attributes
      s = s.addQuestion(sectionId, init, { afterId, lang })
      const createdQuestion = s.elements.getQuestionById(id)!
      const { detail, ...questionStructural } = createdQuestion
      void detail
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ELEMENT,
            action: BUFFERED_PATCH_ACTION_CREATE,
            id: id,
            data: questionStructural,
          },
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { elementIds: s.elementIds },
          },
        ],
      })
      return s
    })
    setSurveyFocus({ entityType: SURVEY_ENTITY_TYPE_ELEMENT, id })
  },

  updateQuestion: (questionId: string, partial: Partial<SurveyQuestion>) =>
    updateSurveyState((s) => {
      const oldQuestion = s.elements.getQuestionById(questionId)
      s = s.updateQuestion(questionId, partial)
      const newQuestion = s.elements.getQuestionById(questionId)

      // If type changed, include transitioned attributes in the patch
      const patchData: PatchData = { ...partial }
      if (
        partial.type &&
        oldQuestion &&
        newQuestion &&
        oldQuestion.type !== partial.type
      ) {
        patchData.attributes = newQuestion.attributes

        // The model may regenerate answer options on a type change (e.g. the
        // point-scale P1..PN set when switching point5 -> point10). Persist the
        // regenerated set, otherwise the server keeps the old options and they
        // are restored - with their stale labels - on the next refetch.
        if (newQuestion.answerOptions !== oldQuestion.answerOptions) {
          patchData.answerOptions = newQuestion.answerOptions
        }

        // When switching to a typed matrix or Multi-Part type, coerce all
        // subquestions/parts to its enforced type
        const matrixConfig = getMatrixTypeConfig(partial.type)
        const multiPartConfig = getMultiPartTypeConfig(partial.type)
        const targetType =
          matrixConfig?.defaultSubquestionType ?? multiPartConfig?.partType
        if (targetType && newQuestion.subquestions) {
          newQuestion.subquestions.forEach((sq) => {
            if (sq.type !== targetType) {
              const newAttributes = transitionSubquestionAttributes(
                sq.attributes || {},
                sq.type || '',
                targetType,
              )
              s = s.mutateSubquestion(
                questionId,
                sq._id,
                (subquestion) =>
                  new SurveySubquestion({
                    ...subquestion,
                    type: targetType,
                    attributes: newAttributes,
                  }),
              )
            }
          })
          patchData.subquestions =
            s.elements.getQuestionById(questionId)?.subquestions
        }
      }

      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ELEMENT,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: questionId,
            data: patchData,
          },
        ],
      })
      return s
    }),

  updateQuestionText: (
    questionId: string,
    text: string,
    lang: string = 'en',
    langDefault?: string,
  ) =>
    updateSurveyState((s) => {
      s = s.mutateQuestion(questionId, (question) =>
        question.updateText(text, lang, langDefault),
      )
      const updatedText = s.elements.getQuestionById(questionId)?.text
      const validationValue =
        updatedText?.getLang(lang, langDefault ?? lang) ?? ''
      const patchText = l10nFieldPatchValue(
        updatedText,
        text,
        lang,
        langDefault,
      )
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ELEMENT,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: questionId,
            data: { text: patchText },
          },
        ],
        validation: {
          schema: questionSchema,
          path: `text.${lang}`,
          value: validationValue,
          entityType: 'question',
          entityId: questionId,
          field: `text.${lang}`,
        },
      })
      return s
    }),

  updateQuestionDetail: (
    questionId: string,
    detail: string,
    lang: string = 'en',
    langDefault?: string,
  ) =>
    updateSurveyState((s) => {
      s = s.mutateQuestion(questionId, (question) =>
        question.updateDetail(detail, lang, langDefault),
      )
      const updatedDetail = s.elements.getQuestionById(questionId)?.detail
      const patchDetail = l10nFieldPatchValue(
        updatedDetail,
        detail,
        lang,
        langDefault,
      )
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ELEMENT,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: questionId,
            data: { detail: patchDetail },
          },
        ],
        validation: {
          schema: l10nHtmlSchema,
          path: lang,
          value: detail,
          entityType: 'question',
          entityId: questionId,
          field: `detail.${lang}`,
        },
      })
      return s
    }),

  deleteQuestionDetail: (questionId: string) =>
    updateSurveyState((s) => {
      s = s.mutateQuestion(questionId, (question) => question.deleteDetail())
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ELEMENT,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: questionId,
            data: {
              detail: s.elements.getQuestionById(questionId)?.detail,
            },
          },
        ],
      })
      return s
    }),

  moveQuestion: (
    questionId: string,
    targetSectionId: string,
    newIndex: number,
  ) =>
    updateSurveyState((s) => {
      s = s.moveQuestion(questionId, targetSectionId, newIndex)
      const sectionId = s.elements.getById(questionId)?.sectionId
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ELEMENT,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: questionId,
            data: { sectionId },
          },
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { elementIds: s.elementIds },
          },
        ],
      })
      return s
    }),

  moveQuestionUp: (questionId: string) =>
    updateSurveyState((s) => {
      s = s.moveQuestionUp(questionId)
      const sectionId = s.elements.getById(questionId)?.sectionId
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ELEMENT,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: questionId,
            data: { sectionId },
          },
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { elementIds: s.elementIds },
          },
        ],
      })
      return s
    }),

  moveQuestionDown: (questionId: string) =>
    updateSurveyState((s) => {
      s = s.moveQuestionDown(questionId)
      const sectionId = s.elements.getById(questionId)?.sectionId
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ELEMENT,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: questionId,
            data: { sectionId },
          },
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { elementIds: s.elementIds },
          },
        ],
      })
      return s
    }),

  deleteQuestion: (questionId: string) => {
    updateSurveyState((s) => {
      s = s.deleteQuestion(questionId)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ELEMENT,
            action: BUFFERED_PATCH_ACTION_DELETE,
            id: questionId,
            data: null,
          },
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { elementIds: s.elementIds },
          },
        ],
      })
      return s
    })
    setSurveyFocus(null)
  },

  setQuestionAttribute: (
    questionId: string,
    attributeId: string,
    value: unknown,
  ) =>
    updateSurveyState((s) => {
      s = s.setQuestionAttribute(questionId, attributeId, value)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ELEMENT,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: questionId,
            data: {
              [`attributes.${attributeId}`]: value,
            },
          },
        ],
      })
      return s
    }),
})
