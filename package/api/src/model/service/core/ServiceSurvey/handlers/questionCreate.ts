import { Patch, SurveyAnswerOptionImageValue } from 'veysur-common'
import {
  PatchContext,
  AnswerOptionLike,
  createHandler,
  persistSurveyLanguageFields,
  extractFileIdsFromAnswerOptions,
  assertUniqueCode,
  assertNoDuplicateCodes,
  assertPatchIdString,
  patchDataRecord,
} from '../PatchContext'

type L10nPatchValue = Record<string, string | null>

type AnswerOptionCreateData = AnswerOptionLike & {
  label?: L10nPatchValue
  image?: Record<string, SurveyAnswerOptionImageValue | null> | null
}

interface QuestionCreatePatchData {
  _id: string
  text?: L10nPatchValue
  detail?: L10nPatchValue
  _lang?: string
  answerOptions?: AnswerOptionCreateData[]
  [key: string]: unknown
}

export async function handleQuestionCreate(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { surveyId, projectId, fileTracker, repos } = ctx
  const svc = ctx.getL10nService()

  const data = patchDataRecord(patch) as QuestionCreatePatchData
  const { text, detail, _lang, answerOptions, ...structuralData } = data
  const questionId = assertPatchIdString(data._id)

  if (answerOptions && Array.isArray(answerOptions)) {
    extractFileIdsFromAnswerOptions(answerOptions).forEach((fileId) =>
      fileTracker.filesAdded.add(fileId),
    )
  }

  const answerOptionsWithoutL10n = answerOptions?.map((ao) => {
    const { label: _label, image: _image, ...aoData } = ao
    return aoData
  })

  if (typeof structuralData.code === 'string') {
    await assertUniqueCode(
      repos.repoSurveyElement,
      ctx,
      'Question',
      structuralData.code,
    )
  }
  if (answerOptionsWithoutL10n) {
    assertNoDuplicateCodes(answerOptionsWithoutL10n, 'Answer option')
  }

  await createHandler(
    repos.repoSurveyElement,
    {
      ...patch,
      data: answerOptionsWithoutL10n
        ? { ...structuralData, answerOptions: answerOptionsWithoutL10n }
        : structuralData,
    },
    ctx,
  )

  const l10nFields: Parameters<typeof persistSurveyLanguageFields>[3] = [
    { l10n: text, fieldPath: `elements.${questionId}.text` },
    { l10n: detail, fieldPath: `elements.${questionId}.detail` },
  ]
  if (answerOptions) {
    for (const ao of answerOptions) {
      if (ao._id && ao.label) {
        l10nFields.push({
          l10n: ao.label,
          fieldPath: `answerOptions.${ao._id}.label`,
        })
      }
    }
  }
  await persistSurveyLanguageFields(svc, surveyId, projectId, l10nFields)

  if (answerOptions) {
    for (const ao of answerOptions) {
      if (
        _lang &&
        ao._id &&
        ao.image !== null &&
        typeof ao.image === 'object' &&
        _lang in ao.image
      ) {
        await svc.upsertAnswerOptionImage(
          surveyId,
          projectId,
          _lang,
          ao._id,
          ao.image[_lang],
        )
      }
    }
  }
}
