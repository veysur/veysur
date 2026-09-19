import { Patch, isSurveyContent, isSurveyQuestion } from 'veysur-common'
import {
  PatchContext,
  AnswerOptionLike,
  deleteHandler,
  buildQuestionSurveyLanguageKeys,
  extractFileIdsFromAnswerOptions,
} from '../PatchContext'

export async function handleSectionDelete(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { surveyId, projectId, context, repos, fileTracker } = ctx
  const svc = ctx.getL10nService()

  const elements = await repos.repoSurveyElement.find(
    { sectionId: patch.id, surveyId },
    { context },
  )

  const dataKeys: string[] = [`sections.${patch.id}`]
  for (const element of elements) {
    if (isSurveyContent(element)) {
      // Content elements carry no answerOptions/subquestions; only their
      // `elements.<id>.text` L10n needs removing.
      dataKeys.push(`elements.${element._id}`)
      continue
    }
    if (!isSurveyQuestion(element)) continue
    if (!Array.isArray(element.answerOptions)) {
      throw new Error(
        `Unexpected non-array answerOptions shape on question ${element._id}`,
      )
    }
    const answerOptions = element.answerOptions as AnswerOptionLike[]
    extractFileIdsFromAnswerOptions(answerOptions).forEach((fileId) =>
      fileTracker.filesRemoved.add(fileId),
    )
    dataKeys.push(...buildQuestionSurveyLanguageKeys(element))
  }

  await repos.repoSurveyElement.deleteMany(
    { sectionId: patch.id, surveyId },
    { context },
  )
  await deleteHandler(repos.repoSurveySection, patch, ctx)
  await svc.removeEntityFields(surveyId, projectId, dataKeys)
}
