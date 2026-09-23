import { Readable } from 'stream'

import { DataSourceContext } from 'mzen-om'
import { ServerErrorNotFound } from 'mzen-server'
import { Survey, SurveyLanguage } from 'veysur-common'

import { createStorageAdaptor, contextForProject } from 'common'
import {
  RepoEmailTemplate,
  RepoFile,
  RepoSurvey,
  RepoSurveyLanguage,
  RepoSurveyParticipantAttribute,
  RepoSurveyParticipantAttributeLanguage,
} from 'model'
import { StorageConfig } from 'model/service/core/ServiceFile/FileS3Config'

import {
  EntityExportContext,
  ExportOptions,
  EntityEmbeddedFileManifestEntry,
} from '../../EntityHandlerInterface'
import { collectReferencedFileIds } from '../util/collectReferencedFileIds'
import { EmailTemplateEntry, VsstParticipantAttribute } from './types'

export class VsstExportCollector {
  constructor(
    private repoSurvey: RepoSurvey,
    private repoSurveyLanguage?: RepoSurveyLanguage,
    private repoFile?: RepoFile,
    private storageConfig?: StorageConfig,
    private repoSurveyParticipantAttribute?: RepoSurveyParticipantAttribute,
    private repoSurveyParticipantAttributeLanguage?: RepoSurveyParticipantAttributeLanguage,
    private repoEmailTemplate?: RepoEmailTemplate,
  ) {}

  async collect(
    surveyId: string,
    context: EntityExportContext,
    _options?: ExportOptions,
  ): Promise<{
    survey: Survey
    surveyLanguages: SurveyLanguage[]
    embeddedFileEntries: EntityEmbeddedFileManifestEntry[]
    participantAttributes: VsstParticipantAttribute[]
    emailTemplates: EmailTemplateEntry[]
  }> {
    const dsContext = contextForProject(context.projectId)

    const survey = await this.repoSurvey.findOne(
      { _id: surveyId },
      { context: dsContext, populate: { elements: true, sections: true } },
    )

    if (!survey) {
      throw new ServerErrorNotFound({ message: 'Survey not found', surveyId })
    }

    const surveyLanguages: SurveyLanguage[] = this.repoSurveyLanguage
      ? await this.repoSurveyLanguage.find({ surveyId }, { context: dsContext })
      : []

    const embeddedFileEntries = await this.collectAnswerOptionFileEntries(
      survey,
      surveyLanguages,
      dsContext,
    )

    const participantAttributes = await this.collectParticipantAttributes(
      surveyId,
      dsContext,
    )

    const emailTemplates = await this.collectEmailTemplates(surveyId, dsContext)

    return {
      survey,
      surveyLanguages,
      embeddedFileEntries,
      participantAttributes,
      emailTemplates,
    }
  }

  private async collectEmailTemplates(
    surveyId: string,
    dsContext: DataSourceContext,
  ): Promise<EmailTemplateEntry[]> {
    if (!this.repoEmailTemplate) return []

    const docs = await this.repoEmailTemplate.find(
      { surveyId },
      { context: dsContext },
    )

    return docs
      .filter((template) => template.subject || template.body)
      .map((template) => ({
        type: template.type,
        lang: template.lang,
        subject: template.subject,
        body: template.body,
      }))
  }

  private async collectParticipantAttributes(
    surveyId: string,
    dsContext: DataSourceContext,
  ): Promise<VsstParticipantAttribute[]> {
    if (!this.repoSurveyParticipantAttribute) return []

    const doc = await this.repoSurveyParticipantAttribute.findOne(
      { surveyId },
      { context: dsContext },
    )

    const definitions = doc?.attributes ?? []
    if (definitions.length === 0) return []

    const languageDocs = this.repoSurveyParticipantAttributeLanguage
      ? await this.repoSurveyParticipantAttributeLanguage.find(
          { surveyId },
          { context: dsContext },
        )
      : []

    const languagesByCode = new Map<
      string,
      Record<string, { label?: string; description?: string }>
    >()
    for (const langDoc of languageDocs) {
      languagesByCode.set(langDoc.languageCode, langDoc.data)
    }

    return definitions.map((def) => {
      const languages: Record<
        string,
        { label?: string; description?: string }
      > = {}
      for (const [code, data] of languagesByCode) {
        if (data[def.name] !== undefined) {
          languages[code] = data[def.name]
        }
      }
      return {
        name: def.name,
        required: def.required,
        example: def.example,
        languages,
      }
    })
  }

  makeBinaryFileStream(
    entry: EntityEmbeddedFileManifestEntry,
  ): () => Promise<Readable> {
    return async () => {
      const adaptor = createStorageAdaptor(this.storageConfig)
      try {
        const result = await adaptor.getObject({
          Bucket: this.storageConfig.publicBucket,
          Key: entry.s3Key,
        })
        return result.Body as Readable
      } catch {
        return Readable.from([])
      }
    }
  }

  private async collectAnswerOptionFileEntries(
    survey: Survey,
    surveyLanguages: SurveyLanguage[],
    dsContext: DataSourceContext,
  ): Promise<EntityEmbeddedFileManifestEntry[]> {
    if (!this.storageConfig || !this.repoFile) return []

    const referencedFileIds = collectReferencedFileIds(survey, surveyLanguages)
    const seenImageSets = new Set<string>()
    const entries: EntityEmbeddedFileManifestEntry[] = []

    for (const fileId of referencedFileIds) {
      const record = await this.repoFile.findOne(
        { _id: fileId, deletedAt: null },
        { context: dsContext },
      )
      if (!record?.imageSetId) continue
      if (seenImageSets.has(record.imageSetId)) continue
      seenImageSets.add(record.imageSetId)

      const variants = await this.repoFile.find(
        { imageSetId: record.imageSetId, deletedAt: null },
        { context: dsContext },
      )

      for (const variant of variants) {
        entries.push({
          fileId: variant._id,
          filename: `${variant.imageVariant}.jpg`,
          s3Key: variant.filePath,
          mimeType: variant.mimeType,
          hash: variant.hash,
          size: variant.size,
          zipPath: `files/${record.imageSetId}/${variant.imageVariant}.jpg`,
          answerOptionId: undefined,
          fileContext: variant.fileContext ?? 'survey',
          imageSetId: record.imageSetId,
          imageVariant: variant.imageVariant as 'original' | 'edited' | 'thumb',
        })
      }
    }

    return entries
  }
}
