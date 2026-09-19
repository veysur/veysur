import { Patch } from 'veysur-common'
import {
  PatchContext,
  updateHandler,
  persistSurveyLanguageFields,
  assertUniqueCode,
  assertPatchIdString,
  type L10nFieldEntry,
} from '../PatchContext'

type ContentUpdatePayload = {
  text?: Record<string, string | null>
  _lang?: string
  code?: string
  [key: string]: unknown
}

export async function handleContentUpdate(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { text, _lang, ...structuralData } = (patch.data ??
    {}) as ContentUpdatePayload
  const elementId = assertPatchIdString(patch.id)
  const svc = ctx.getL10nService()

  if (typeof structuralData.code === 'string') {
    await assertUniqueCode(
      ctx.repos.repoSurveyElement,
      ctx,
      'Content element',
      structuralData.code,
      elementId,
    )
  }

  const l10nFields: L10nFieldEntry[] = []
  if (text) {
    l10nFields.push({ l10n: text, fieldPath: `elements.${elementId}.text` })
  }
  await persistSurveyLanguageFields(
    svc,
    ctx.surveyId,
    ctx.projectId,
    l10nFields,
  )

  if (Object.keys(structuralData).length > 0) {
    await updateHandler(
      ctx.repos.repoSurveyElement,
      { ...patch, data: structuralData },
      ctx,
    )
  }
}
