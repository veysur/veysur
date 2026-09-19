import { Patch, isSurveyQuestion } from 'veysur-common'
import {
  PatchContext,
  AnswerOptionLike,
  deleteHandler,
  buildQuestionSurveyLanguageKeys,
  extractFileIdsFromAnswerOptions,
} from '../PatchContext'

export async function handleQuestionDelete(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { surveyId, projectId, context, repos, fileTracker } = ctx
  const svc = ctx.getL10nService()

  const question = await repos.repoSurveyElement.findOne(
    { _id: patch.id, surveyId },
    { context },
  )

  if (question && isSurveyQuestion(question)) {
    if (!Array.isArray(question.answerOptions)) {
      throw new Error(
        `Unexpected non-array answerOptions shape on question ${question._id}`,
      )
    }
    const answerOptions = question.answerOptions as AnswerOptionLike[]
    extractFileIdsFromAnswerOptions(answerOptions).forEach((fileId) =>
      fileTracker.filesRemoved.add(fileId),
    )
    await svc.removeEntityFields(
      surveyId,
      projectId,
      buildQuestionSurveyLanguageKeys(question),
    )
  }

  await deleteHandler(repos.repoSurveyElement, patch, ctx)
}
