import { Patch } from 'veysur-common'
import {
  PatchContext,
  updateHandler,
  persistSurveyLanguageFields,
  assertUniqueCode,
  assertValidSectionKind,
  isSingletonSectionKind,
  splitSingletonSectionL10n,
  assertPatchIdString,
  patchDataRecord,
  type L10nFieldEntry,
} from '../PatchContext'

type SectionUpdatePayload = {
  name?: Record<string, string>
  desc?: Record<string, string> | null
  code?: string
  [key: string]: unknown
}

export async function handleSectionUpdate(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { name, desc, ...structuralData } = patchDataRecord(
    patch,
  ) as SectionUpdatePayload
  const groupId = assertPatchIdString(patch.id)
  const svc = ctx.getL10nService()

  assertValidSectionKind(structuralData.kind)

  if (typeof structuralData.code === 'string') {
    await assertUniqueCode(
      ctx.repos.repoSurveySection,
      ctx,
      'Group',
      structuralData.code,
      groupId,
    )
  }

  const kind = await resolveSectionKind(patch, ctx, structuralData.kind)

  if (isSingletonSectionKind(kind)) {
    const { l10nFields, clearedFields } = await splitSingletonSectionL10n(
      kind,
      desc,
      structuralData,
    )
    await persistSurveyLanguageFields(
      svc,
      ctx.surveyId,
      ctx.projectId,
      l10nFields,
    )
    if (clearedFields.length > 0) {
      await svc.removeEntityFields(ctx.surveyId, ctx.projectId, clearedFields)
    }
    if (Object.keys(structuralData).length > 0) {
      await updateHandler(
        ctx.repos.repoSurveySection,
        { ...patch, data: structuralData },
        ctx,
      )
    }
    return
  }

  const l10nFields: L10nFieldEntry[] = []
  if (name)
    l10nFields.push({ l10n: name, fieldPath: `sections.${groupId}.name` })
  if (desc)
    l10nFields.push({ l10n: desc, fieldPath: `sections.${groupId}.desc` })
  await persistSurveyLanguageFields(
    svc,
    ctx.surveyId,
    ctx.projectId,
    l10nFields,
  )

  if (desc === null) {
    await svc.removeEntityFields(ctx.surveyId, ctx.projectId, [
      `sections.${groupId}.desc`,
    ])
  }

  if (Object.keys(structuralData).length > 0) {
    await updateHandler(
      ctx.repos.repoSurveySection,
      { ...patch, data: structuralData },
      ctx,
    )
  }
}

/**
 * Editor patches for an existing section usually omit `kind`. Fall back to the
 * stored row so a `desc`-only welcome/thank-you edit still routes to the flat
 * SurveyLanguage keys.
 */
async function resolveSectionKind(
  patch: Patch,
  ctx: PatchContext,
  patchKind: unknown,
): Promise<unknown> {
  if (patchKind !== undefined) return patchKind
  const rows = await ctx.repos.repoSurveySection.find(
    { _id: patch.id, surveyId: ctx.surveyId },
    { context: ctx.context },
  )
  return rows[0]?.kind
}
