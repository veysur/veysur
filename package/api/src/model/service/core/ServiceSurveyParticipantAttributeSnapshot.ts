import { Service } from '@datacapy/server'
import { DataSourceContext } from '@datacapy/om'
import { Survey, SettingSurvey } from 'veysur-common'

import {
  RepoSettingSurvey,
  RepoSurvey,
  RepoSurveyParticipantAttribute,
  RepoSurveyParticipantAttributeLanguage,
  RepoSurveyParticipantAttributeSnapshot,
  RepoSurveyParticipantAttributeLanguageSnapshot,
  RepoSurveyPublication,
  RepoSurveySnapshotPartial,
} from 'model'
import { contextForProject } from 'common'

export class ServiceSurveyParticipantAttributeSnapshot extends Service {
  constructor() {
    super({ name: 'surveyParticipantAttributeSnapshot' })
  }

  async get({
    surveyId,
    projectId,
    lang,
  }: {
    surveyId: string
    projectId: string
    lang?: string
  }): Promise<{
    attributes: Array<{
      name: string
      label: string
      description?: string
      required: boolean
      example: string | null
    }>
    languageDefault: string
    languageOptions: string[]
  }> {
    const context = contextForProject(projectId)

    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')
    const publication = await repoPublication.findOne(
      { surveyId, stoppedAt: null },
      { context },
    )

    if (!publication) {
      return { attributes: [], languageDefault: 'en', languageOptions: ['en'] }
    }

    const repoAttrSnapshot =
      this.getRepo<RepoSurveyParticipantAttributeSnapshot>(
        'surveyParticipantAttributeSnapshot',
      )
    const repoAttrLangSnapshot =
      this.getRepo<RepoSurveyParticipantAttributeLanguageSnapshot>(
        'surveyParticipantAttributeLanguageSnapshot',
      )

    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const snapshotPartialDoc = await repoSurveySnapshotPartial.findOne(
      { _id: publication.snapshotId },
      { context },
    )

    // Fall back to live data only for genuine pre-migration snapshots (no
    // partial survey stored). The attribute-snapshot row is absent whenever the
    // survey has no participant attributes, so it must not gate language
    // resolution.
    if (!snapshotPartialDoc) {
      return this.getLiveAttributes({ surveyId, lang, context })
    }

    const langDefault =
      snapshotPartialDoc.surveyPartial?.language?.default ?? 'en'
    const langOptions = snapshotPartialDoc.surveyPartial?.language?.options ?? [
      langDefault,
    ]

    const attrSnapshotDoc = await repoAttrSnapshot.findOne(
      { snapshotId: publication.snapshotId },
      { context },
    )

    // No participant attributes defined for this survey - still return the
    // language config resolved from the partial survey above.
    if (!attrSnapshotDoc) {
      return {
        attributes: [],
        languageDefault: langDefault,
        languageOptions: langOptions,
      }
    }

    const langCodes = Array.from(
      new Set([lang, langDefault].filter(Boolean)),
    ) as string[]
    const attrLangSnapshotDocs = await repoAttrLangSnapshot.find(
      { snapshotId: publication.snapshotId, languageCode: { $in: langCodes } },
      { context },
    )

    const languagesByCode = new Map<
      string,
      Record<string, { label?: string; description?: string }>
    >()
    for (const langDoc of attrLangSnapshotDocs) {
      languagesByCode.set(langDoc.languageCode, langDoc.data)
    }

    const definitions = (attrSnapshotDoc.attributes ?? []).filter(
      (a) => !a.internal,
    )

    return {
      attributes: definitions.map((def) => {
        const resolvedLang = lang ?? langDefault
        const data =
          languagesByCode.get(resolvedLang)?.[def.name] ??
          languagesByCode.get(langDefault)?.[def.name] ??
          {}

        return {
          name: def.name,
          label: data.label || def.name,
          description: data.description,
          required: def.required,
          example: def.example,
        }
      }),
      languageDefault: langDefault,
      languageOptions: langOptions,
    }
  }

  private async getLiveAttributes({
    surveyId,
    lang,
    context,
  }: {
    surveyId: string
    lang?: string
    context: DataSourceContext
  }): Promise<{
    attributes: Array<{
      name: string
      label: string
      description?: string
      required: boolean
      example: string | null
    }>
    languageDefault: string
    languageOptions: string[]
  }> {
    const repoAttribute = this.getRepo<RepoSurveyParticipantAttribute>(
      'surveyParticipantAttribute',
    )
    const repoAttributeLanguage =
      this.getRepo<RepoSurveyParticipantAttributeLanguage>(
        'surveyParticipantAttributeLanguage',
      )
    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')

    const [surveyData, settingSurveyData] = await Promise.all([
      repoSurvey.findOne(
        { _id: surveyId },
        { context, fields: { language: 1 } },
      ),
      repoSettingSurvey.findOne({}, { context }),
    ])

    const survey = new Survey(surveyData)
    const settingSurvey = new SettingSurvey(settingSurveyData)
    const languageConfig = survey.getLanguage(settingSurvey)
    const langDefault = languageConfig.default
    const langOptions = languageConfig.options

    const [doc, languageDocs] = await Promise.all([
      repoAttribute.findOne({ surveyId }, { context }),
      repoAttributeLanguage.find(
        {
          surveyId,
          languageCode: {
            $in: Array.from(new Set([lang, langDefault].filter(Boolean))),
          },
        },
        { context },
      ),
    ])

    const languagesByCode = new Map<
      string,
      Record<string, { label?: string; description?: string }>
    >()
    for (const langDoc of languageDocs) {
      languagesByCode.set(langDoc.languageCode, langDoc.data)
    }

    const definitions = (doc?.attributes ?? []).filter((a) => !a.internal)

    return {
      attributes: definitions.map((def) => {
        const resolvedLang = lang ?? langDefault
        const data =
          languagesByCode.get(resolvedLang)?.[def.name] ??
          languagesByCode.get(langDefault)?.[def.name] ??
          {}

        return {
          name: def.name,
          label: data.label || def.name,
          description: data.description,
          required: def.required,
          example: def.example,
        }
      }),
      languageDefault: langDefault,
      languageOptions: langOptions,
    }
  }
}

export default ServiceSurveyParticipantAttributeSnapshot
