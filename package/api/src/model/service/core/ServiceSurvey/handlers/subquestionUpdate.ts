import { Patch } from 'veysur-common'
import {
  PatchContext,
  persistSurveyLanguageFields,
  assertPatchIdString,
  type L10nFieldEntry,
} from '../PatchContext'

export async function handleSubquestionUpdate(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { surveyId, projectId, context, repos } = ctx
  const svc = ctx.getL10nService()
  const { text, detail } = (patch.data ?? {}) as {
    text?: Record<string, string | null>
    detail?: Record<string, string | null>
  }
  const subquestionId = assertPatchIdString(patch.id)

  const l10nFields: L10nFieldEntry[] = []
  const clearedEntityFields: string[] = []
  if (text === null)
    clearedEntityFields.push(`subquestions.${subquestionId}.text`)
  else if (text)
    l10nFields.push({
      l10n: text,
      fieldPath: `subquestions.${subquestionId}.text`,
    })
  if (detail === null)
    clearedEntityFields.push(`subquestions.${subquestionId}.detail`)
  else if (detail)
    l10nFields.push({
      l10n: detail,
      fieldPath: `subquestions.${subquestionId}.detail`,
    })
  if (clearedEntityFields.length) {
    await svc.removeEntityFields(surveyId, projectId, clearedEntityFields)
  }
  await persistSurveyLanguageFields(svc, surveyId, projectId, l10nFields)

  await repos.repoSurvey.updateOne(
    { _id: surveyId },
    { $set: { updatedAt: new Date() } },
    { context },
  )
}
