import { Repo, ServerErrorBadRequest } from '@datacapy/server'
import { DataSourceContext } from '@datacapy/om'
import {
  Patch,
  PatchId,
  SurveyAnswerOptionData,
  schemaManager,
  SECTION_KIND_WELCOME,
  SECTION_KIND_GROUP,
  SECTION_KIND_THANK_YOU,
} from 'veysur-common'

import {
  RepoSurvey,
  RepoEmailTemplate,
  RepoSurveyElement,
  RepoSurveySection,
} from 'model'
import { ServiceSurveyLanguage } from '../ServiceSurveyLanguage'

export type AnswerOptionLike = {
  _id?: string
  image?: Record<string, { fileId?: string } | null> | null
  files?: { _id?: string }[]
}

type QuestionLike = {
  _id?: string
  answerOptions?: unknown
  subquestions?: unknown
}

export interface PatchContext {
  surveyId: string
  projectId: string
  userId: string
  context: DataSourceContext
  repos: {
    repoSurvey: RepoSurvey
    repoSurveyElement: RepoSurveyElement
    repoSurveySection: RepoSurveySection
    repoSurveyEmailTemplate: RepoEmailTemplate
  }
  getL10nService: () => ServiceSurveyLanguage
  fileTracker: { filesAdded: Set<string>; filesRemoved: Set<string> }
}

/**
 * `Patcher` types `patch.id` as `PatchId` (string | number | record | undefined)
 * and `patch.data` as `PatchData` (`{ [k]: unknown } | null`). Every survey
 * handler needs a string id and an object payload; narrow once here with a
 * 400 on a malformed patch instead of an `as` cast at each site.
 */
export function assertPatchIdString(id: PatchId): string {
  if (typeof id === 'string' && id.length > 0) return id
  throw new ServerErrorBadRequest({
    id: ['Patch id must be a non-empty string'],
  })
}

export function patchDataRecord(patch: Patch): Record<string, unknown> {
  const { data } = patch
  if (data && typeof data === 'object' && !Array.isArray(data)) return data
  throw new ServerErrorBadRequest({ data: ['Patch data must be an object'] })
}

export async function createHandler(
  repo: Repo<unknown>,
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const patchData = patch.data as {
    answerOptions?: Partial<SurveyAnswerOptionData>[]
    [key: string]: unknown
  }
  const data = {
    ...patchData,
    surveyId: ctx.surveyId,
    createdById: ctx.userId,
  }
  if (patchData?.answerOptions && Array.isArray(patchData.answerOptions)) {
    data.answerOptions = patchData.answerOptions.map((option) => ({
      ...option,
      createdById: option.createdById || ctx.userId,
    }))
  }
  await repo.insertOne(data, { context: ctx.context })
}

export async function updateHandler(
  repo: Repo<unknown>,
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  const { surveyId, userId, context, repos } = ctx
  const updateData: Record<string, unknown> = { ...patch.data }
  delete updateData._id
  delete updateData.surveyId
  delete updateData.createdAt
  delete updateData.update
  delete updateData.createdById

  if (updateData.answerOptions && Array.isArray(updateData.answerOptions)) {
    updateData.answerOptions = (
      updateData.answerOptions as Partial<SurveyAnswerOptionData>[]
    ).map((option) => ({
      ...option,
      createdById: option.createdById || userId,
    }))
  }

  repo.initSchema()
  if (repo.schema) {
    await repo.schema.applyFiltersPaths(updateData)
  }

  updateData.updatedAt = new Date()

  const filter =
    repo.name === 'survey' ? { _id: patch.id } : { _id: patch.id, surveyId }

  await repo.updateOne(filter, { $set: updateData }, { context })

  if (repo.name !== 'survey') {
    await repos.repoSurvey.updateOne(
      { _id: surveyId },
      { $set: { updatedAt: new Date() } },
      { context },
    )
  }
}

export async function deleteHandler(
  repo: Repo<unknown>,
  patch: Patch,
  ctx: PatchContext,
): Promise<void> {
  await repo.deleteOne(
    { _id: patch.id, surveyId: ctx.surveyId },
    { context: ctx.context },
  )
}

export type L10nFieldEntry = {
  l10n: Record<string, string | null> | undefined | null
  fieldPath: string
}

export function collectL10nFieldUpdate(
  l10n: Record<string, string | null> | undefined,
  fieldPath: string,
  l10nFields: L10nFieldEntry[],
  clearedFields: string[],
): void {
  if (!l10n) return
  if (Object.keys(l10n).length === 0) {
    clearedFields.push(fieldPath)
  } else {
    l10nFields.push({ l10n, fieldPath })
  }
}

export async function persistSurveyLanguageFields(
  service: ServiceSurveyLanguage,
  surveyId: string,
  projectId: string,
  fields: L10nFieldEntry[],
): Promise<void> {
  const byLang = new Map<string, Record<string, string | null>>()
  for (const { l10n, fieldPath } of fields) {
    if (!l10n || typeof l10n !== 'object' || Array.isArray(l10n)) continue
    for (const [lang, value] of Object.entries(l10n)) {
      if (typeof value !== 'string' && value !== null) continue
      let langFields = byLang.get(lang)
      if (!langFields) {
        langFields = {}
        byLang.set(lang, langFields)
      }
      langFields[fieldPath] = value
    }
  }
  for (const [lang, fieldValues] of byLang) {
    await service.upsertFields(surveyId, projectId, lang, fieldValues)
  }
}

export function buildQuestionSurveyLanguageKeys(
  question: QuestionLike,
): string[] {
  const keys: string[] = [`elements.${question._id}`]
  const answerOptions = question.answerOptions as AnswerOptionLike[] | undefined
  if (answerOptions !== undefined && !Array.isArray(answerOptions)) {
    throw new Error(
      `Unexpected non-array answerOptions shape on question ${question._id}`,
    )
  }
  for (const ao of answerOptions ?? []) {
    if (ao._id) keys.push(`answerOptions.${ao._id}`)
  }
  const subquestions = question.subquestions as { _id?: string }[] | undefined
  if (subquestions !== undefined && !Array.isArray(subquestions)) {
    throw new Error(
      `Unexpected non-array subquestions shape on question ${question._id}`,
    )
  }
  for (const sq of subquestions ?? []) {
    if (sq._id) keys.push(`subquestions.${sq._id}`)
  }
  return keys
}

// Server-side defence-in-depth: the in-memory Survey collections
// (SurveyElementCollection etc.) enforce code uniqueness too, but patches
// are applied directly against Mongo here and never construct those
// collections, so that guard is unreachable from real save traffic.

/**
 * Asserts that `code` is not already used by a sibling document in `repo`
 * for the current survey. Used for question and group codes, which must be
 * unique across the whole survey.
 */
export async function assertUniqueCode(
  repo: Repo<unknown>,
  ctx: PatchContext,
  entityLabel: string,
  code: string,
  excludeId?: string,
): Promise<void> {
  const existing = (await repo.find(
    { surveyId: ctx.surveyId, code },
    { context: ctx.context },
  )) as { _id?: string }[]

  if (existing.some((item) => item._id !== excludeId)) {
    throw new ServerErrorBadRequest({
      code: [`${entityLabel} with code "${code}" already exists`],
    })
  }
}

/**
 * Asserts that no two items in `items` share the same `code`. Used for
 * subquestion and answer-option codes, which only need to be unique among
 * their own siblings within the owning question — the patch always carries
 * the full sibling array, so no repo lookup is needed.
 */
export function assertNoDuplicateCodes(
  items: Record<string, unknown>[],
  entityLabel: string,
): void {
  const seen = new Set<unknown>()
  for (const item of items) {
    if (item.code === undefined) continue
    if (seen.has(item.code)) {
      throw new ServerErrorBadRequest({
        code: [`${entityLabel} with code "${item.code}" already exists`],
      })
    }
    seen.add(item.code)
  }
}

export type SingletonSectionKind =
  typeof SECTION_KIND_WELCOME | typeof SECTION_KIND_THANK_YOU

const VALID_SECTION_KINDS: string[] = [
  SECTION_KIND_WELCOME,
  SECTION_KIND_GROUP,
  SECTION_KIND_THANK_YOU,
]

/**
 * Reject a `kind` value the section schema (which has no enum) would otherwise
 * wave through. `undefined` is allowed — the schema defaults it to `'group'`.
 */
export function assertValidSectionKind(kind: unknown): void {
  if (kind !== undefined && !VALID_SECTION_KINDS.includes(kind as string)) {
    throw new ServerErrorBadRequest({ kind: ['Unknown section kind'] })
  }
}

export function isSingletonSectionKind(
  kind: unknown,
): kind is SingletonSectionKind {
  return kind === SECTION_KIND_WELCOME || kind === SECTION_KIND_THANK_YOU
}

/**
 * The welcome / thank-you sections keep their translatable text (`desc`, and the
 * thank-you link `url` / `text`) in flat SurveyLanguage keys — the same ones
 * `extractSurveyLanguageFromSurvey` / `mergeSurveyLanguageIntoSurvey` round-trip
 * — never under the generic `sections.<id>.*` namespace (which is emitted only for
 * the kind-filtered `survey.sections.groups()`).
 *
 * Pulls those L10n values out of the section patch's `desc` + structural
 * `config.link`, mutating `structuralData` so the link `url` / `text` do not
 * reach the section row. Returns the field entries to persist and the flat keys
 * to clear (from an explicit `null` desc or a cleared link).
 */
export async function splitSingletonSectionL10n(
  kind: SingletonSectionKind,
  desc: Record<string, string | null> | null | undefined,
  structuralData: Record<string, unknown>,
): Promise<{ l10nFields: L10nFieldEntry[]; clearedFields: string[] }> {
  const descKey =
    kind === SECTION_KIND_WELCOME ? 'welcomeSectionDesc' : 'thankYouSectionDesc'
  const l10nFields: L10nFieldEntry[] = []
  const clearedFields: string[] = []

  if (desc === null) clearedFields.push(descKey)
  else if (desc) l10nFields.push({ l10n: desc, fieldPath: descKey })

  if (kind !== SECTION_KIND_THANK_YOU) return { l10nFields, clearedFields }

  const config = structuralData.config
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    const configObj = config as Record<string, unknown>
    const link = configObj.link
    if (link === null) {
      clearedFields.push('thankYouSectionLinkUrl', 'thankYouSectionLinkText')
    } else if (link && typeof link === 'object' && !Array.isArray(link)) {
      const linkObj = link as Record<string, unknown>
      const url = linkObj.url as Record<string, string | null> | undefined
      const text = linkObj.text as Record<string, string | null> | undefined
      if (url) {
        await schemaManager.getSchema('l10nUrl')?.applyFilters(url)
        l10nFields.push({ l10n: url, fieldPath: 'thankYouSectionLinkUrl' })
      }
      if (text) {
        l10nFields.push({ l10n: text, fieldPath: 'thankYouSectionLinkText' })
      }
      delete linkObj.url
      delete linkObj.text
      if (Object.keys(linkObj).length === 0) delete configObj.link
    }
    if (Object.keys(configObj).length === 0) delete structuralData.config
  }

  return { l10nFields, clearedFields }
}

export function extractFileIdsFromAnswerOptions(
  answerOptions: AnswerOptionLike[],
): string[] {
  const fileIds: string[] = []
  for (const answerOption of answerOptions) {
    if (answerOption.image && typeof answerOption.image === 'object') {
      for (const val of Object.values(answerOption.image)) {
        if (val?.fileId) fileIds.push(val.fileId)
      }
    }
    if (answerOption.files && Array.isArray(answerOption.files)) {
      for (const file of answerOption.files) {
        if (file._id) fileIds.push(file._id)
      }
    }
  }
  return fileIds
}
