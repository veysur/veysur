import {
  Patch,
  SurveyAnswerOptionImageValue,
  isSurveyQuestion,
} from 'veysur-common'
import {
  PatchContext,
  updateHandler,
  persistSurveyLanguageFields,
  collectL10nFieldUpdate,
  extractFileIdsFromAnswerOptions,
  assertUniqueCode,
  assertNoDuplicateCodes,
  assertPatchIdString,
  type L10nFieldEntry,
} from '../PatchContext'

export async function handleQuestionUpdate(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { surveyId, projectId, context, repos, fileTracker } = ctx
  const svc = ctx.getL10nService()
  type AnswerOptionPatch = {
    _id?: string
    label?: Record<string, string>
    image?: Record<string, unknown>
    [key: string]: unknown
  }
  type SubquestionPatch = {
    _id?: string
    text?: Record<string, string>
    [key: string]: unknown
  }
  type QuestionUpdateData = {
    text?: Record<string, string>
    detail?: Record<string, string>
    _lang?: string
    answerOptions?: AnswerOptionPatch[]
    subquestions?: SubquestionPatch[]
    [key: string]: unknown
  }
  const { text, detail, _lang, ...remainingData } = (patch.data ??
    {}) as QuestionUpdateData

  if (
    patch.data &&
    Object.prototype.hasOwnProperty.call(patch.data, 'answerOptions')
  ) {
    const existingQuestion = await repos.repoSurveyElement.findOne(
      { _id: patch.id, surveyId },
      { context },
    )

    const existingAnswerOptions = isSurveyQuestion(existingQuestion)
      ? existingQuestion.answerOptions
      : undefined
    if (existingQuestion && !Array.isArray(existingAnswerOptions)) {
      throw new Error(
        `Unexpected non-array answerOptions shape on question ${existingQuestion._id}`,
      )
    }
    const oldAnswerOptions = existingAnswerOptions ?? []

    const oldFileIds = extractFileIdsFromAnswerOptions(
      oldAnswerOptions as AnswerOptionPatch[],
    )
    const newFileIds = extractFileIdsFromAnswerOptions(
      Array.isArray(patch.data.answerOptions)
        ? (patch.data.answerOptions as AnswerOptionPatch[])
        : [],
    )

    const oldFileSet = new Set(oldFileIds)
    const newFileSet = new Set(newFileIds)
    newFileIds.forEach((fileId) => {
      if (!oldFileSet.has(fileId)) fileTracker.filesAdded.add(fileId)
    })
    oldFileIds.forEach((fileId) => {
      if (!newFileSet.has(fileId)) fileTracker.filesRemoved.add(fileId)
    })

    if (existingQuestion) {
      const newAoIds = new Set(
        ((patch.data.answerOptions as AnswerOptionPatch[] | undefined) ?? [])
          .map((ao) => ao._id)
          .filter(Boolean),
      )
      const removedAoKeys = (oldAnswerOptions as AnswerOptionPatch[])
        .map((ao) => ao._id)
        .filter((id) => id && !newAoIds.has(id))
        .map((id) => `answerOptions.${id}`)
      if (removedAoKeys.length) {
        await svc.removeEntityFields(surveyId, projectId, removedAoKeys)
      }
    }
  }

  const l10nFields: L10nFieldEntry[] = []
  const clearedEntityFields: string[] = []
  const questionId = assertPatchIdString(patch.id)
  if (text === null) clearedEntityFields.push(`elements.${questionId}.text`)
  else if (text)
    l10nFields.push({ l10n: text, fieldPath: `elements.${questionId}.text` })
  if (detail === null) clearedEntityFields.push(`elements.${questionId}.detail`)
  else if (detail)
    l10nFields.push({
      l10n: detail,
      fieldPath: `elements.${questionId}.detail`,
    })
  if (
    remainingData.answerOptions &&
    Array.isArray(remainingData.answerOptions)
  ) {
    for (const ao of remainingData.answerOptions) {
      if (ao._id) {
        collectL10nFieldUpdate(
          ao.label,
          `answerOptions.${ao._id}.label`,
          l10nFields,
          clearedEntityFields,
        )
      }
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
          ao.image[_lang] as SurveyAnswerOptionImageValue,
        )
      }
    }
    remainingData.answerOptions = remainingData.answerOptions.map((ao) => {
      const { label: _label, image: _image, ...aoData } = ao
      return aoData
    })
  }

  if (remainingData.subquestions && Array.isArray(remainingData.subquestions)) {
    for (const sq of remainingData.subquestions) {
      if (sq._id) {
        collectL10nFieldUpdate(
          sq.text,
          `subquestions.${sq._id}.text`,
          l10nFields,
          clearedEntityFields,
        )
      }
    }
    remainingData.subquestions = remainingData.subquestions.map((sq) => {
      const { text: _text, ...sqData } = sq
      return sqData
    })
  }

  if (typeof remainingData.code === 'string') {
    await assertUniqueCode(
      repos.repoSurveyElement,
      ctx,
      'Question',
      remainingData.code,
      questionId,
    )
  }
  if (Array.isArray(remainingData.answerOptions)) {
    assertNoDuplicateCodes(remainingData.answerOptions, 'Answer option')
  }
  if (Array.isArray(remainingData.subquestions)) {
    assertNoDuplicateCodes(remainingData.subquestions, 'Subquestion')
  }

  if (clearedEntityFields.length) {
    await svc.removeEntityFields(surveyId, projectId, clearedEntityFields)
  }

  await persistSurveyLanguageFields(svc, surveyId, projectId, l10nFields)

  await updateHandler(
    repos.repoSurveyElement,
    { ...patch, data: remainingData },
    ctx,
  )
}
