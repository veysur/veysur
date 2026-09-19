import { Patch, ELEMENT_KIND_CONTENT } from 'veysur-common'
import {
  PatchContext,
  createHandler,
  persistSurveyLanguageFields,
  assertUniqueCode,
  assertPatchIdString,
  patchDataRecord,
} from '../PatchContext'

interface ContentCreatePatchData {
  _id: string
  code?: string
  text?: Record<string, string | null>
  _lang?: string
  [key: string]: unknown
}

export async function handleContentCreate(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const data = patchDataRecord(patch) as ContentCreatePatchData
  const { text, _lang, ...structuralData } = data
  const elementId = assertPatchIdString(data._id)
  const svc = ctx.getL10nService()

  if (typeof structuralData.code === 'string') {
    await assertUniqueCode(
      ctx.repos.repoSurveyElement,
      ctx,
      'Content element',
      structuralData.code,
    )
  }

  await createHandler(
    ctx.repos.repoSurveyElement,
    { ...patch, data: { ...structuralData, kind: ELEMENT_KIND_CONTENT } },
    ctx,
  )

  await persistSurveyLanguageFields(svc, ctx.surveyId, ctx.projectId, [
    { l10n: text, fieldPath: `elements.${elementId}.text` },
  ])
}
