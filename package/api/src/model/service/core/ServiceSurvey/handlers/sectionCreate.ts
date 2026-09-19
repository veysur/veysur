import { Patch } from 'veysur-common'
import {
  PatchContext,
  createHandler,
  persistSurveyLanguageFields,
  assertUniqueCode,
  assertValidSectionKind,
  isSingletonSectionKind,
  splitSingletonSectionL10n,
  assertPatchIdString,
  patchDataRecord,
} from '../PatchContext'

type SectionCreatePayload = {
  _id?: string
  code?: string
  name?: Record<string, string>
  desc?: Record<string, string>
  [key: string]: unknown
}

export async function handleSectionCreate(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const data = patchDataRecord(patch) as SectionCreatePayload
  const { name, desc, ...structuralData } = data
  const groupId = assertPatchIdString(data._id)
  const svc = ctx.getL10nService()

  assertValidSectionKind(structuralData.kind)

  if (typeof structuralData.code === 'string') {
    await assertUniqueCode(
      ctx.repos.repoSurveySection,
      ctx,
      'Group',
      structuralData.code,
    )
  }

  if (isSingletonSectionKind(structuralData.kind)) {
    const { l10nFields } = await splitSingletonSectionL10n(
      structuralData.kind,
      desc,
      structuralData,
    )
    await createHandler(
      ctx.repos.repoSurveySection,
      { ...patch, data: structuralData },
      ctx,
    )
    await persistSurveyLanguageFields(
      svc,
      ctx.surveyId,
      ctx.projectId,
      l10nFields,
    )
    return
  }

  await createHandler(
    ctx.repos.repoSurveySection,
    { ...patch, data: structuralData },
    ctx,
  )
  await persistSurveyLanguageFields(svc, ctx.surveyId, ctx.projectId, [
    { l10n: name, fieldPath: `sections.${groupId}.name` },
    { l10n: desc, fieldPath: `sections.${groupId}.desc` },
  ])
}
