import { Patch } from 'veysur-common'
import {
  PatchContext,
  persistSurveyLanguageFields,
  assertPatchIdString,
  patchDataRecord,
} from '../PatchContext'

type AnswerOptionUpdatePayload = { label?: Record<string, string> }

export async function handleAnswerOptionUpdate(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { surveyId, projectId, context, repos } = ctx
  const svc = ctx.getL10nService()
  const { label } = patchDataRecord(patch) as AnswerOptionUpdatePayload
  const answerId = assertPatchIdString(patch.id)

  await persistSurveyLanguageFields(svc, surveyId, projectId, [
    { l10n: label, fieldPath: `answerOptions.${answerId}.label` },
  ])

  await repos.repoSurvey.updateOne(
    { _id: surveyId },
    { $set: { updatedAt: new Date() } },
    { context },
  )
}
