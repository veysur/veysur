import {
  SurveyAnswerOptionData,
  SurveyQuestionData,
  BUFFERED_PATCH_ACTION_UPDATE,
  schemaManager,
} from 'veysur-common'

import { OperationDependencies } from './type'
import { l10nFieldPatchValue } from './l10nFieldPatch'
import {
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
} from '../../constant'

const answerOptionSchema = schemaManager.getSchema('surveyAnswerOption')

const createPatchQuestionUpdate = (
  questionId: string,
  data: Partial<SurveyQuestionData> & { _lang?: string },
) => {
  return {
    type: SURVEY_ENTITY_TYPE_ELEMENT,
    action: BUFFERED_PATCH_ACTION_UPDATE,
    id: questionId,
    data,
  }
}

export const createAnswerOptionOperations = ({
  updateSurveyState,
  validateAndBuffer,
}: OperationDependencies) => ({
  addAnswerOption: (
    questionId: string,
    init: Partial<SurveyAnswerOptionData> = {},
    afterId?: string,
    defaultLabelLang?: string,
  ) =>
    updateSurveyState((s) => {
      const oldIds = new Set(
        s.elements
          .getQuestionById(questionId)
          ?.answerOptions?.map((ao) => ao._id) ?? [],
      )
      s = s.addAnswerOption(questionId, init, afterId)
      if (defaultLabelLang) {
        const newOption = s.elements
          .getQuestionById(questionId)
          ?.answerOptions?.find((ao) => !oldIds.has(ao._id))
        if (newOption) {
          s = s.mutateAnswerOption(questionId, newOption._id, (ao) =>
            ao.updateLabel(ao.code, defaultLabelLang),
          )
        }
      }
      const question = s.elements.getQuestionById(questionId)
      if (question) {
        validateAndBuffer({
          patches: [
            createPatchQuestionUpdate(question._id, {
              answerOptions: question.answerOptions,
            }),
          ],
        })
      }
      return s
    }),

  updateAnswerOption: (
    questionId: string,
    answerId: string,
    data: Partial<SurveyAnswerOptionData>,
  ) =>
    updateSurveyState((s) => {
      s = s.updateAnswerOption(questionId, answerId, data)
      const question = s.elements.getQuestionById(questionId)
      if (question) {
        validateAndBuffer({
          patches: [
            createPatchQuestionUpdate(question._id, {
              answerOptions: question.answerOptions,
            }),
          ],
        })
      }
      return s
    }),

  updateAnswerOptionLabel: (
    questionId: string,
    answerId: string,
    text: string,
    lang: string = 'en',
    langDefault?: string,
  ) =>
    updateSurveyState((s) => {
      s = s.mutateAnswerOption(questionId, answerId, (answerOption) => {
        return answerOption.updateLabel(text, lang, langDefault)
      })
      const updatedLabel = s.elements
        .getQuestionById(questionId)
        ?.answerOptions?.find((ao) => ao._id === answerId)?.label
      const validationValue =
        updatedLabel?.getLang(lang, langDefault ?? lang) ?? ''
      // Clearing a label is always a valid "deletion", regardless of language:
      // for a secondary language it falls back to the default language; for
      // the default language it is stored as an explicit empty string. Either
      // way it must bypass notEmpty() validation, or the patch is silently
      // dropped and the old label reappears on the next refetch.
      const isDeletion = text === ''
      const patchLabel = l10nFieldPatchValue(
        updatedLabel,
        text,
        lang,
        langDefault,
      )
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_ANSWER_OPTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: answerId,
            data: { label: patchLabel },
          },
        ],
        ...(isDeletion
          ? {}
          : {
              validation: {
                schema: answerOptionSchema,
                path: `label.${lang}`,
                value: validationValue,
                entityType: 'answerOption',
                entityId: answerId,
                field: `label.${lang}`,
              },
            }),
      })
      return s
    }),

  moveAnswerOption: (questionId: string, answerId: string, newIndex: number) =>
    updateSurveyState((s) => {
      s = s.moveAnswerOption(questionId, answerId, newIndex)
      const question = s.elements.getQuestionById(questionId)
      if (question) {
        validateAndBuffer({
          patches: [
            createPatchQuestionUpdate(question._id, {
              answerOptions: question.answerOptions,
            }),
          ],
        })
      }
      return s
    }),

  deleteAnswerOption: (questionId: string, answerId: string) =>
    updateSurveyState((s) => {
      s = s.deleteAnswerOption(questionId, answerId)
      const question = s.elements.getQuestionById(questionId)
      if (question) {
        validateAndBuffer({
          patches: [
            createPatchQuestionUpdate(question._id, {
              answerOptions: question.answerOptions,
            }),
          ],
        })
      }
      return s
    }),

  updateAnswerOptionImage: (
    questionId: string,
    answerId: string,
    imageData: { imagePath: string | null; imageFileId: string | null },
    lang: string,
  ) =>
    updateSurveyState((s) => {
      s = s.mutateAnswerOption(questionId, answerId, (answerOption) => {
        if (imageData.imagePath && imageData.imageFileId) {
          return answerOption.setImageLang(
            { path: imageData.imagePath, fileId: imageData.imageFileId },
            lang,
          )
        }
        return answerOption.clearImage(lang)
      })
      const question = s.elements.getQuestionById(questionId)
      if (question) {
        validateAndBuffer({
          patches: [
            createPatchQuestionUpdate(question._id, {
              answerOptions: question.answerOptions,
              _lang: lang,
            }),
          ],
        })
      }
      return s
    }),
})
