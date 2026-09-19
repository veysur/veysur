import { Patch } from 'veysur-common'
import { genUniqueId } from 'mzen-id'
import { PatchContext } from '../PatchContext'

export async function handleEmailTemplateUpdate(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { surveyId, context, repos } = ctx

  if (patch.data.subject === null) {
    await repos.repoSurveyEmailTemplate.deleteOne(
      {
        surveyId,
        type: patch.data.type,
        lang: patch.data.lang,
      },
      { context },
    )
  } else {
    const existing = await repos.repoSurveyEmailTemplate.findOne(
      {
        surveyId,
        type: patch.data.type,
        lang: patch.data.lang,
      },
      { context },
    )

    if (existing) {
      const updateData: Record<string, unknown> = { ...patch.data }
      delete updateData._id
      delete updateData.surveyId
      delete updateData.type
      delete updateData.lang
      delete updateData.createdAt
      delete updateData.updatedAt
      updateData.updatedAt = new Date()

      await repos.repoSurveyEmailTemplate.updateOne(
        { _id: existing._id },
        { $set: updateData },
        { context },
      )
    } else {
      await repos.repoSurveyEmailTemplate.create(
        {
          _id: genUniqueId(),
          surveyId,
          type: patch.data.type,
          lang: patch.data.lang,
          subject: patch.data.subject || '',
          body: patch.data.body || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { context },
      )
    }
  }

  await repos.repoSurvey.updateOne(
    { _id: surveyId },
    { $set: { updatedAt: new Date() } },
    { context },
  )
}
