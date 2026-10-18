import { BotProtectionSetting, Patch, schemaManager } from 'veysur-common'
import { mergeBotProtectionSecrets } from '../../../botProtection/botProtectionSecrets'
import {
  PatchContext,
  updateHandler,
  persistSurveyLanguageFields,
  type L10nFieldEntry,
} from '../PatchContext'

type L10nField = Record<string, string>

const BOT_PROTECTION_SECRET_PATH =
  /^botProtection\.(cloudflare|google)\.secretKey$/

type SurveyUpdateData = {
  title?: L10nField
  dataPolicy?: { text?: L10nField; [key: string]: unknown }
  legalNotice?: { text?: L10nField; [key: string]: unknown }
  botProtection?: BotProtectionSetting
  [key: string]: unknown
}

// Runs an optional named schema filter against an l10n field, then queues it
// for persistence. Centralised so every l10n field goes through the same
// filter-then-push path — a new field needing normalisation (like l10nUrl for
// the thank-you link) only needs a schemaName argument here, not a bespoke
// inline call.
async function pushL10nField(
  value: L10nField | undefined,
  fieldPath: string,
  l10nFields: L10nFieldEntry[],
  schemaName?: string,
): Promise<void> {
  if (!value) return
  if (schemaName) await schemaManager.getSchema(schemaName)?.applyFilters(value)
  l10nFields.push({ l10n: value, fieldPath })
}

export async function handleSurveyUpdate(
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { surveyId, projectId, repos } = ctx
  const svc = ctx.getL10nService()
  const updateData: SurveyUpdateData = { ...patch.data }
  const l10nFields: L10nFieldEntry[] = []

  if (updateData.title) {
    await pushL10nField(updateData.title, 'title', l10nFields)
    delete updateData.title
  }

  // welcome / thankYou text is edited via `section` patches now (phase 1c
  // slice 4) — handled by handleSectionUpdate / splitSingletonSectionL10n.

  if (updateData.dataPolicy && typeof updateData.dataPolicy === 'object') {
    const { text: dataPolicyText, ...dataPolicyRest } = updateData.dataPolicy
    await pushL10nField(dataPolicyText, 'dataPolicyText', l10nFields)
    updateData.dataPolicy =
      Object.keys(dataPolicyRest).length > 0 ? dataPolicyRest : undefined
    if (!updateData.dataPolicy) delete updateData.dataPolicy
  }

  if (updateData.legalNotice && typeof updateData.legalNotice === 'object') {
    const { text: legalNoticeText, ...legalNoticeRest } = updateData.legalNotice
    await pushL10nField(legalNoticeText, 'legalNoticeText', l10nFields)
    updateData.legalNotice =
      Object.keys(legalNoticeRest).length > 0 ? legalNoticeRest : undefined
    if (!updateData.legalNotice) delete updateData.legalNotice
  }

  // The editor patches one field at a time as a dotted key; a blank secret
  // means "keep the stored one", as in a whole-object write
  for (const key of Object.keys(updateData)) {
    const value = updateData[key]
    if (
      BOT_PROTECTION_SECRET_PATH.test(key) &&
      typeof value === 'string' &&
      !value.trim()
    ) {
      delete updateData[key]
    }
  }

  if (
    updateData.botProtection &&
    typeof updateData.botProtection === 'object'
  ) {
    const stored = await repos.repoSurvey.findOne(
      { _id: patch.id },
      { context: ctx.context },
    )
    updateData.botProtection = mergeBotProtectionSecrets(
      updateData.botProtection,
      stored?.botProtection,
      { nullInherits: true },
    )
  }

  await persistSurveyLanguageFields(svc, surveyId, projectId, l10nFields)
  await updateHandler(repos.repoSurvey, { ...patch, data: updateData }, ctx)
}
