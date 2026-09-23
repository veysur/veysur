import { Service } from 'mzen-server'
import {
  Survey,
  SurveyLanguage,
  SurveyLanguageSnapshot,
  SurveyLanguageData,
  SurveyAnswerOptionImageValue,
  mergeSurveyLanguageIntoSurvey,
} from 'veysur-common'
import { genUniqueId } from 'mzen-id'

import { RepoSurveyLanguage, RepoSurveyLanguageSnapshot } from 'model'
import { contextForProject } from 'common'

export class ServiceSurveyLanguage extends Service {
  constructor() {
    super({
      name: 'surveyLanguage',
    })
  }

  async getLanguages(
    surveyId: string,
    projectId: string,
    languageCodes: string[],
  ): Promise<SurveyLanguage[]> {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyLanguage>('surveyLanguage')
    if (!languageCodes.length) return []
    return repo.find(
      { surveyId, languageCode: { $in: languageCodes } },
      { context },
    )
  }

  async getSurveyWithLanguages(
    survey: Survey,
    projectId: string,
    lang: string,
    defaultLang: string,
  ): Promise<Survey> {
    const codes = Array.from(new Set([lang, defaultLang].filter(Boolean)))
    const languages = await this.getLanguages(survey._id, projectId, codes)
    if (!languages.length) return survey
    return mergeSurveyLanguageIntoSurvey(survey, languages)
  }

  async getSnapshotLanguages(
    snapshotId: string,
    projectId: string,
    languageCodes: string[],
  ): Promise<SurveyLanguageSnapshot[]> {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyLanguageSnapshot>(
      'surveyLanguageSnapshot',
    )
    if (!languageCodes.length) return []
    return repo.find(
      { snapshotId, languageCode: { $in: languageCodes } },
      { context },
    )
  }

  async upsertAnswerOptionImage(
    surveyId: string,
    projectId: string,
    languageCode: string,
    answerId: string,
    image: SurveyAnswerOptionImageValue | null,
  ): Promise<void> {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyLanguage>('surveyLanguage')
    const existing = await repo.findOne({ surveyId, languageCode }, { context })
    if (existing) {
      const { path: setPath, value: setValue } = resolveMinimalSetPath(
        existing.data ?? {},
        `answerOptions.${answerId}.image`,
        image,
      )
      await repo.updateOne(
        { _id: existing._id },
        { $set: { [setPath]: setValue, updatedAt: new Date() } },
        { context },
      )
    } else {
      await repo.insertOne(
        new SurveyLanguage({
          _id: genUniqueId(),
          surveyId,
          languageCode,
          data: { answerOptions: { [answerId]: { image } } },
        }),
        { context },
      )
    }
  }

  /**
   * Upsert a single L10n field value for a given language.
   *
   * fieldPath is a dot-separated path within SurveyLanguageData, e.g.:
   *   'title'
   *   'questions.<questionId>.text'
   *   'groups.<groupId>.name'
   *   'answerOptions.<answerId>.label'
   */
  async upsertField(
    surveyId: string,
    projectId: string,
    languageCode: string,
    fieldPath: string,
    value: string,
  ): Promise<void> {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyLanguage>('surveyLanguage')

    const existing = await repo.findOne({ surveyId, languageCode }, { context })

    if (existing) {
      const { path: setPath, value: setValue } = resolveMinimalSetPath(
        existing.data ?? {},
        fieldPath,
        value,
      )
      await repo.updateOne(
        { surveyId, languageCode },
        { $set: { [setPath]: setValue, updatedAt: new Date() } },
        { context },
      )
    } else {
      const textPatch = buildNestedDataPatch(fieldPath, value)
      const surveyLanguage = new SurveyLanguage({
        _id: genUniqueId(),
        surveyId,
        languageCode,
        data: textPatch,
      })
      await repo.insertOne(surveyLanguage, { context })
    }
  }

  async deleteField(
    surveyId: string,
    projectId: string,
    languageCode: string,
    fieldPath: string,
  ): Promise<void> {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyLanguage>('surveyLanguage')
    await repo.updateOne(
      { surveyId, languageCode },
      {
        $unset: { [`data.${fieldPath}`]: '' },
        $set: { updatedAt: new Date() },
      },
      { context },
    )
  }

  async upsertFields(
    surveyId: string,
    projectId: string,
    languageCode: string,
    fieldValues: Record<string, string | null>,
  ): Promise<void> {
    const entries = Object.entries(fieldValues)
    if (!entries.length) return

    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyLanguage>('surveyLanguage')

    const toSet: Record<string, string> = {}
    const toUnset: string[] = []
    for (const [fieldPath, value] of entries) {
      if (typeof value === 'string') toSet[fieldPath] = value
      else if (value === null) toUnset.push(fieldPath)
    }

    const existing = await repo.findOne({ surveyId, languageCode }, { context })

    if (existing) {
      const setFields: JsonRecord = {}
      for (const [fieldPath, value] of Object.entries(toSet)) {
        const { path: setPath, value: setValue } = resolveMinimalSetPath(
          existing.data ?? {},
          fieldPath,
          value,
        )
        if (isPlainObject(setValue) && isPlainObject(setFields[setPath])) {
          deepMerge(setFields[setPath], setValue)
        } else {
          setFields[setPath] = setValue
        }
      }
      const unsetFields: Record<string, ''> = {}
      for (const fieldPath of toUnset) {
        unsetFields[`data.${fieldPath}`] = ''
      }
      const update: {
        $set: JsonRecord
        $unset?: Record<string, ''>
      } = { $set: { ...setFields, updatedAt: new Date() } }
      if (Object.keys(unsetFields).length) update.$unset = unsetFields
      await repo.updateOne({ surveyId, languageCode }, update, { context })
    } else {
      if (!Object.keys(toSet).length) return
      const data: SurveyLanguageData = {}
      for (const [fieldPath, value] of Object.entries(toSet)) {
        deepMerge(
          data as JsonRecord,
          buildNestedDataPatch(fieldPath, value) as JsonRecord,
        )
      }
      await repo.insertOne(
        new SurveyLanguage({
          _id: genUniqueId(),
          surveyId,
          languageCode,
          data,
        }),
        { context },
      )
    }
  }

  async removeEntityFields(
    surveyId: string,
    projectId: string,
    dataKeys: string[],
  ): Promise<void> {
    if (!dataKeys.length) return
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyLanguage>('surveyLanguage')
    const unsetFields: Record<string, ''> = {}
    for (const key of dataKeys) {
      unsetFields[`data.${key}`] = ''
    }
    await repo.updateMany(
      { surveyId },
      { $unset: unsetFields, $set: { updatedAt: new Date() } },
      { context },
    )
  }
}

/**
 * Walk existingData along fieldPath intermediates to find the deepest level that
 * already exists as a plain object. Returns the narrowest safe MongoDB $set path
 * (prefixed with "data.") and its corresponding value, avoiding dot-notation
 * through non-existent intermediates.
 *
 * fieldPath 'sections.G1.name', data = {}          → path 'data.sections',    value { G1: { name } }
 * fieldPath 'sections.G1.name', data = {sections:{}} → path 'data.sections.G1', value { name }
 * fieldPath 'sections.G1.name', all exist           → path 'data.sections.G1.name', value (scalar)
 */
type JsonRecord = Record<string, unknown>

function isPlainObject(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function resolveMinimalSetPath(
  existingData: SurveyLanguageData,
  fieldPath: string,
  value: unknown,
): { path: string; value: unknown } {
  const parts = fieldPath.split('.')
  const intermediates = parts.slice(0, -1)

  let current: JsonRecord = existingData as JsonRecord
  let depth = 0

  for (const part of intermediates) {
    const next = current[part]
    if (isPlainObject(next)) {
      current = next
      depth++
    } else {
      break
    }
  }

  const setPath = ['data', ...parts.slice(0, depth + 1)].join('.')
  const remainingPath = parts.slice(depth + 1).join('.')
  const setValue = remainingPath
    ? buildNestedDataPatch(remainingPath, value)
    : value

  return { path: setPath, value: setValue }
}

function deepMerge(target: JsonRecord, source: JsonRecord): JsonRecord {
  for (const [key, val] of Object.entries(source)) {
    if (isPlainObject(val) && isPlainObject(target[key])) {
      deepMerge(target[key], val)
    } else {
      target[key] = val
    }
  }
  return target
}

/**
 * Build a SurveyLanguageData object from a dot-path and value.
 * e.g. 'elements.q1.text', 'hello' → { elements: { q1: { text: 'hello' } } }
 */
function buildNestedDataPatch(
  fieldPath: string,
  value: unknown,
): SurveyLanguageData {
  const parts = fieldPath.split('.')
  const result: JsonRecord = {}
  let current = result
  for (let i = 0; i < parts.length - 1; i++) {
    current[parts[i]] = {}
    current = current[parts[i]] as JsonRecord
  }
  current[parts[parts.length - 1]] = value
  return result as SurveyLanguageData
}

export default ServiceSurveyLanguage
