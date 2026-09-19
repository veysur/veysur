import { Readable } from 'stream'

import { Survey, SurveyLanguage } from 'veysur-common'

import {
  RepoEmailTemplate,
  RepoFile,
  RepoSurvey,
  RepoSurveyLanguage,
  RepoSurveyParticipantAttribute,
  RepoSurveyParticipantAttributeLanguage,
} from 'model'
import { AclContext } from 'model/entity/AclContext'
import { StorageConfig } from 'model/service/core/ServiceFile/FileS3Config'

import {
  EntityHandlerInterface,
  EntityExportContext,
  ExportOptions,
  FormatFileEntry,
  EntityEmbeddedFileManifestEntry,
  ImportValidationResult,
  PersistImportContext,
} from '../EntityHandlerInterface'
import { FormatHandlerInterface } from '../format/FormatHandlerInterface'
import { buildStructuralSurveyJson } from './util/buildStructuralSurveyJson'
import { VsstExportCollector } from './SurveyEntityHandler/VsstExportCollector'
import { VsstImportParser } from './SurveyEntityHandler/VsstImportParser'
import { VsstImportResolver } from './SurveyEntityHandler/VsstImportResolver'
import { VsstImportPersister } from './SurveyEntityHandler/VsstImportPersister'
import {
  EmailTemplateEntry,
  VsstParticipantAttribute,
  VsstParsedBundle,
  VsstResolvedContext,
} from './SurveyEntityHandler/types'

/**
 * Survey entity handler for import/export
 *
 * Exports and imports live survey structure + embedded answer-option images
 * as a .vsst ZIP archive. Delegates each concern to a focused collaborator.
 *
 * SurveyEntityHandler (orchestrator)
 * ├── VsstExportCollector  — fetch survey + image metadata from repos
 * ├── VsstImportParser     — validate ZIP structure; extract JSON + manifest
 * ├── VsstImportResolver   — ID translation, validation, file resolution
 * └── VsstImportPersister  — upload images to S3, persist all in one transaction
 */
export class SurveyEntityHandler implements EntityHandlerInterface {
  entityType = 'survey'

  private collector: VsstExportCollector
  private parser: VsstImportParser
  private resolver: VsstImportResolver
  private persister: VsstImportPersister

  constructor(
    repoSurvey: RepoSurvey,
    repoSurveyLanguage?: RepoSurveyLanguage,
    repoFile?: RepoFile,
    storageConfig?: StorageConfig,
    repoSurveyParticipantAttribute?: RepoSurveyParticipantAttribute,
    repoSurveyParticipantAttributeLanguage?: RepoSurveyParticipantAttributeLanguage,
    repoEmailTemplate?: RepoEmailTemplate,
  ) {
    this.collector = new VsstExportCollector(
      repoSurvey,
      repoSurveyLanguage,
      repoFile,
      storageConfig,
      repoSurveyParticipantAttribute,
      repoSurveyParticipantAttributeLanguage,
      repoEmailTemplate,
    )
    this.parser = new VsstImportParser()
    this.resolver = new VsstImportResolver(repoSurvey, repoFile)
    this.persister = new VsstImportPersister(
      repoSurvey,
      repoSurveyLanguage,
      repoFile,
      storageConfig,
      repoSurveyParticipantAttribute,
      repoSurveyParticipantAttributeLanguage,
      repoEmailTemplate,
    )
  }

  async fetchForExport(
    surveyId: string,
    context: EntityExportContext,
    options?: ExportOptions,
  ): Promise<unknown> {
    return this.collector.collect(surveyId, context, options)
  }

  async prepareExportData(
    data: unknown,
    formatHandler: FormatHandlerInterface,
    _options?: ExportOptions,
  ): Promise<Readable> {
    const {
      survey,
      surveyLanguages = [],
      embeddedFileEntries,
      participantAttributes = [],
      emailTemplates = [],
    } = data as {
      survey: Survey
      surveyLanguages: SurveyLanguage[]
      embeddedFileEntries: EntityEmbeddedFileManifestEntry[]
      participantAttributes: VsstParticipantAttribute[]
      emailTemplates: EmailTemplateEntry[]
    }

    const surveyJson = buildStructuralSurveyJson(survey)

    const files: FormatFileEntry[] = [
      {
        filename: 'survey.json',
        content: JSON.stringify(surveyJson, null, 2),
      },
    ]

    for (const lang of surveyLanguages) {
      files.push({
        filename: `surveyLanguages/${lang.languageCode}.json`,
        content: JSON.stringify(
          { languageCode: lang.languageCode, data: lang.data ?? {} },
          null,
          2,
        ),
      })
    }

    for (const attribute of participantAttributes) {
      files.push({
        filename: `participantAttributes/${attribute.name}.json`,
        content: JSON.stringify(attribute, null, 2),
      })
    }

    for (const template of emailTemplates) {
      files.push({
        filename: `templates/${template.type}-${template.lang}.json`,
        content: JSON.stringify(template, null, 2),
      })
    }

    if (embeddedFileEntries?.length > 0) {
      const manifest = { version: '1.0', files: embeddedFileEntries }
      files.push({
        filename: 'files/manifest.json',
        content: JSON.stringify(manifest, null, 2),
      })
      for (const entry of embeddedFileEntries) {
        files.push({
          filename: entry.zipPath,
          size: entry.size,
          stream: this.collector.makeBinaryFileStream(entry),
        })
      }
    }

    return formatHandler.serialize(files)
  }

  async parseImportData(
    input: Readable,
    formatHandler: FormatHandlerInterface,
    context?: { importFileId?: string },
  ): Promise<VsstParsedBundle> {
    return this.parser.parse(input, formatHandler, context)
  }

  async validateImport(
    data: unknown,
    options: { force?: boolean; projectId: string; aclContext: AclContext },
  ): Promise<ImportValidationResult<VsstResolvedContext>> {
    return this.resolver.resolve(data as VsstParsedBundle, options)
  }

  async persistImport(
    data: unknown,
    context: PersistImportContext,
  ): Promise<{ entityId: string; hasIdTranslations?: boolean }> {
    return this.persister.persist(data as VsstResolvedContext, context)
  }

  getSupportedFormats(): string[] {
    return ['vsst']
  }

  getDefaultFormat(): string {
    return 'vsst'
  }
}
