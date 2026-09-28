import { Readable } from 'stream'

import {
  RepoSurveyLanguageSnapshot,
  RepoSurveyParticipantAttributeSnapshot,
  RepoSurveyParticipantAttributeLanguageSnapshot,
  RepoSurveyPublication,
  RepoSurveyResponse,
  RepoSurveySnapshot,
  RepoSurveySnapshotPartial,
  RepoSurvey,
  RepoSurveyParticipant,
  RepoSurveyElement,
  RepoSurveySection,
  RepoFile,
} from 'model'
import { StorageConfig } from 'model/service/core/ServiceFile/FileS3Config'
import { contextForProject } from 'common'

import {
  EntityHandlerInterface,
  EntityExportContext,
  ExportOptions,
  FormatFileEntry,
  EntityEmbeddedFileManifestEntry,
  ImportValidationResult,
  PersistImportContext,
} from '../EntityHandlerInterface'
import { ESTIMATED_BYTES_PER_RESPONSE } from './util/asyncTransferSizeThreshold'
import { FormatHandlerInterface } from '../format/FormatHandlerInterface'
import { SnapshotDataRemapper } from './SurveyPublicationEntityHandler/SnapshotDataRemapper'
import { VsspExportCollector } from './SurveyPublicationEntityHandler/VsspExportCollector'
import { VsspImportParser } from './SurveyPublicationEntityHandler/VsspImportParser'
import { VsspImportResolver } from './SurveyPublicationEntityHandler/VsspImportResolver'
import { VsspImportPersister } from './SurveyPublicationEntityHandler/VsspImportPersister'
import {
  RawJson,
  ResolvedImportContext,
  ResponseFileManifestEntry,
  VsspParsedBundle,
} from './SurveyPublicationEntityHandler/types'

/**
 * Survey publication entity handler for composite export/import
 *
 * Exports and imports survey structure + responses + binary files as a .vsp archive.
 * Delegates each concern to a focused collaborator class.
 */
export class SurveyPublicationEntityHandler implements EntityHandlerInterface {
  entityType = 'surveyPublication'

  private collector: VsspExportCollector
  private parser: VsspImportParser
  private resolver: VsspImportResolver
  private persister: VsspImportPersister

  constructor(
    private repoSurveyResponse: RepoSurveyResponse,
    private repoSurveyPublication: RepoSurveyPublication,
    private repoSurveySnapshot: RepoSurveySnapshot,
    private repoSurveySnapshotPartial: RepoSurveySnapshotPartial,
    private repoSurvey: RepoSurvey,
    private repoSurveyParticipant: RepoSurveyParticipant,
    private repoSurveyElement: RepoSurveyElement,
    private repoSurveySection: RepoSurveySection,
    private repoSurveyLanguageSnapshot?: RepoSurveyLanguageSnapshot,
    private repoFile?: RepoFile,
    private storageConfig?: StorageConfig,
    private repoSurveyParticipantAttributeSnapshot?: RepoSurveyParticipantAttributeSnapshot,
    private repoSurveyParticipantAttributeLanguageSnapshot?: RepoSurveyParticipantAttributeLanguageSnapshot,
  ) {
    this.collector = new VsspExportCollector(
      repoSurveyPublication,
      repoSurveySnapshotPartial,
      repoSurveySnapshot,
      repoSurveyResponse,
      repoSurveyLanguageSnapshot,
      repoFile,
      storageConfig,
      repoSurveyParticipantAttributeSnapshot,
      repoSurveyParticipantAttributeLanguageSnapshot,
    )
    this.parser = new VsspImportParser()
    this.resolver = new VsspImportResolver(
      repoSurvey,
      repoSurveySnapshotPartial,
      repoSurveyPublication,
      repoFile,
    )
    this.persister = new VsspImportPersister(
      repoSurveyResponse,
      repoSurveyPublication,
      repoSurveySnapshot,
      repoSurveySnapshotPartial,
      repoSurvey,
      repoSurveyParticipant,
      repoSurveyElement,
      repoSurveySection,
      new SnapshotDataRemapper(),
      repoSurveyLanguageSnapshot,
      repoFile,
      storageConfig,
      repoSurveyParticipantAttributeSnapshot,
      repoSurveyParticipantAttributeLanguageSnapshot,
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
      publication,
      snapshot,
      snapshotData,
      surveyLanguageSnapshots = [],
      surveyParticipantAttributeSnapshot = null,
      surveyParticipantAttributeLanguageSnapshots = [],
      responseEntries,
      publicationId: _publicationId,
      embeddedFileEntries,
      responseFileEntries,
    } = data as {
      publication: RawJson
      snapshot: RawJson | null
      snapshotData: RawJson
      surveyLanguageSnapshots: RawJson[]
      surveyParticipantAttributeSnapshot: RawJson | null
      surveyParticipantAttributeLanguageSnapshots: RawJson[]
      responseEntries: FormatFileEntry[]
      publicationId: string | null
      embeddedFileEntries: EntityEmbeddedFileManifestEntry[]
      responseFileEntries?: ResponseFileManifestEntry[]
    }

    const files: FormatFileEntry[] = [
      {
        filename: 'surveyPublication.json',
        content: JSON.stringify(publication, null, 2),
      },
      {
        filename: 'surveySnapshotData.json',
        content: JSON.stringify(snapshotData, null, 2),
      },
    ]

    if (snapshot) {
      files.push({
        filename: 'surveySnapshot.json',
        content: JSON.stringify(snapshot, null, 2),
      })
    }

    if (surveyLanguageSnapshots.length > 0) {
      files.push({
        filename: 'surveyLanguageSnapshots.json',
        content: JSON.stringify(surveyLanguageSnapshots, null, 2),
      })
    }

    if (surveyParticipantAttributeSnapshot) {
      files.push({
        filename: 'surveyParticipantAttributeSnapshot.json',
        content: JSON.stringify(surveyParticipantAttributeSnapshot, null, 2),
      })
    }

    if (surveyParticipantAttributeLanguageSnapshots.length > 0) {
      files.push({
        filename: 'surveyParticipantAttributeLanguageSnapshots.json',
        content: JSON.stringify(
          surveyParticipantAttributeLanguageSnapshots,
          null,
          2,
        ),
      })
    }

    files.push(...responseEntries)

    if (embeddedFileEntries?.length > 0) {
      const manifest = { version: '1.0', files: embeddedFileEntries }
      files.push({
        filename: 'files/manifest.json',
        content: JSON.stringify(manifest, null, 2),
      })
      for (const entry of embeddedFileEntries) {
        files.push({
          filename: entry.archiveEntryPath,
          size: entry.size,
          stream: this.collector.makeBinaryFileStream(entry),
        })
      }
    }

    if (responseFileEntries?.length > 0) {
      const entriesByBucket = new Map<string, ResponseFileManifestEntry[]>()
      for (const entry of responseFileEntries) {
        const group = entriesByBucket.get(entry.bucket) ?? []
        group.push(entry)
        entriesByBucket.set(entry.bucket, group)
      }
      for (const [bucket, entries] of entriesByBucket) {
        files.push({
          filename: `files/response-manifest-${bucket}.json`,
          content: JSON.stringify({ version: '1.0', files: entries }, null, 2),
        })
      }
      for (const entry of responseFileEntries) {
        files.push({
          filename: entry.archiveEntryPath,
          size: entry.size,
          stream: this.collector.makeBinaryFileStream(entry),
        })
      }
    }

    return await formatHandler.serialize(files)
  }

  async parseImportData(
    input: Readable,
    formatHandler: FormatHandlerInterface,
    context?: { importFileId?: string },
  ): Promise<VsspParsedBundle> {
    return this.parser.parse(input, formatHandler, context)
  }

  async validateImport(
    data: unknown,
    options: {
      force?: boolean
      projectId: string
      aclContext: PersistImportContext['aclContext']
      surveyId?: string
    },
  ): Promise<ImportValidationResult<ResolvedImportContext>> {
    return this.resolver.resolve(data as VsspParsedBundle, options)
  }

  async persistImport(
    data: unknown,
    context: PersistImportContext,
  ): Promise<{
    entityId: string
    hasIdTranslations?: boolean
    warnings?: unknown[]
  }> {
    return this.persister.persist(data as ResolvedImportContext, context)
  }

  getSupportedFormats(): string[] {
    return ['vssp']
  }

  getDefaultFormat(): string {
    return 'vssp'
  }

  /**
   * Estimate export size as response-count-based weight plus the actual
   * embedded answer-option image size (see VsspExportCollector.estimateSize).
   * When no publicationId is given (SurveyFullEntityHandler's vssa
   * delegation, estimating the whole survey), sums the image size across
   * every publication — a handful of publications/images at most, cheap to
   * enumerate, and never worse than an overestimate that queues something
   * that could have run inline.
   */
  async estimateExportSize(
    entityId: string,
    context: EntityExportContext,
    options?: ExportOptions,
  ): Promise<number> {
    const dsContext = contextForProject(context.projectId)
    const query: Record<string, unknown> = { surveyId: entityId }
    if (options?.publicationId) query.publicationId = options.publicationId

    const responseCount = await this.repoSurveyResponse.count(query, {
      context: dsContext,
    })

    const publicationIds = options?.publicationId
      ? [options.publicationId]
      : (
          await this.repoSurveyPublication.find(
            { surveyId: entityId },
            { context: dsContext },
          )
        ).map((publication) => publication._id)

    let imageSize = 0
    for (const publicationId of publicationIds) {
      imageSize += await this.collector.estimateSize(context, {
        ...options,
        publicationId,
      })
    }

    return responseCount * ESTIMATED_BYTES_PER_RESPONSE + imageSize
  }
}
