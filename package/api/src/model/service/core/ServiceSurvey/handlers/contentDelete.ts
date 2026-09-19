import { Patch } from 'veysur-common'
import { PatchContext, deleteHandler } from '../PatchContext'

export async function handleContentDelete(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { surveyId, projectId, context, repos } = ctx
  const svc = ctx.getL10nService()

  const element = await repos.repoSurveyElement.findOne(
    { _id: patch.id, surveyId },
    { context },
  )

  if (element) {
    await svc.removeEntityFields(surveyId, projectId, [
      `elements.${element._id}`,
    ])
  }

  await deleteHandler(repos.repoSurveyElement, patch, ctx)
}
