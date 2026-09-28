import { Readable } from 'stream'
import { extname } from 'path'

import { DataSourceContext } from 'mzen-om'
import { ServerErrorBadRequest, ServerErrorNotFound } from 'mzen-server'
import { SurveySnapshot, SurveyLanguageSnapshot } from 'veysur-common'

import { createStorageAdaptor, contextForProject, responseFileBucket } from 'common'
import {
  RepoSurveyLanguageSnapshot,
  RepoSurveyParticipantAttributeSnapshot,
  RepoSurveyParticipantAttributeLanguageSnapshot,
  RepoSurveyPublication,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  RepoSurveyResponse,
  RepoFile,
} from 'model'
import { StorageConfig } from 'model/service/core/ServiceFile/FileS3Config'

import {
  EntityExportContext,
  ExportOptions,
  EntityEmbeddedFileManifestEntry,
  FormatFileEntry,
} from '../../EntityHandlerInterface'
import { collectReferencedFileIds } from '../util/collectReferencedFileIds'
import { collectResponseFileIds } from '../util/collectResponseFileIds'
import { buildResponseEnvelope } from '../util/buildResponseEnvelope'
import { RESPONSE_EXPORT_BATCH_SIZE } from '../util/responseExportBatch'
import {
  MAX_RESPONSE_EXPORT_FILE_COUNT,
  MAX_RESPONSE_EXPORT_TOTAL_SIZE,
} from '../util/responseFileExportLimits'
import { ResponseFileManifestEntry } from './types'

export class VsspExportCollector {
  constructor(
    private repoSurveyPublication: RepoSurveyPublication,
    private repoSurveySnapshotPartial: RepoSurveySnapshotPartial,
    private repoSurveySnapshot: RepoSurveySnapshot,
    private repoSurveyResponse: RepoSurveyResponse,
    private repoSurveyLanguageSnapshot?: RepoSurveyLanguageSnapshot,
    private repoFile?: RepoFile,
    private storageConfig?: StorageConfig,
    private repoSurveyParticipantAttributeSnapshot?: RepoSurveyParticipantAttributeSnapshot,
    private repoSurveyParticipantAttributeLanguageSnapshot?: RepoSurveyParticipantAttributeLanguageSnapshot,
  ) {}

  async collect(
    surveyId: string,
    context: EntityExportContext,
    options?: ExportOptions,
  ): Promise<unknown> {
    const dsContext = contextForProject(context.projectId)

    const publication = await this.repoSurveyPublication.findOne(
      { _id: options.publicationId },
      { context: dsContext },
    )
    if (!publication) {
      throw new ServerErrorNotFound({
        message: 'Publication not found',
        publicationId: options.publicationId,
      })
    }

    const snapshot = await this.repoSurveySnapshotPartial.findOne(
      { _id: publication.snapshotId },
      { context: dsContext },
    )

    const snapshotData = await this.repoSurveySnapshot.findOne(
      { snapshotId: publication.snapshotId },
      { context: dsContext },
    )
    if (!snapshotData?.survey) {
      throw new ServerErrorNotFound({ message: 'Snapshot data not found' })
    }

    const responseEntries: FormatFileEntry[] = []
    const referencedResponseFileIds = new Set<string>()
    let skip = 0
    let batchIndex = 0
    while (true) {
      const batch = await this.repoSurveyResponse.find(
        {
          surveyId,
          publicationId: options.publicationId,
        },
        {
          context: dsContext,
          populate: { participant: true },
          limit: RESPONSE_EXPORT_BATCH_SIZE,
          skip,
        },
      )
      if (batch.length === 0) break
      const batchNum = String(++batchIndex).padStart(6, '0')
      responseEntries.push({
        filename: `responses/batch-${batchNum}.json`,
        content: JSON.stringify(
          buildResponseEnvelope(
            surveyId,
            options.publicationId as string,
            batch,
          ),
          null,
          2,
        ),
      })
      for (const response of batch) {
        for (const fileId of collectResponseFileIds(
          response.answers as Record<string, unknown>,
        )) {
          referencedResponseFileIds.add(fileId)
        }
      }
      if (batch.length < RESPONSE_EXPORT_BATCH_SIZE) break
      skip += RESPONSE_EXPORT_BATCH_SIZE
    }

    const surveyLanguageSnapshots = this.repoSurveyLanguageSnapshot
      ? await this.repoSurveyLanguageSnapshot.find(
          { snapshotId: publication.snapshotId },
          { context: dsContext },
        )
      : []

    const surveyParticipantAttributeSnapshot = this
      .repoSurveyParticipantAttributeSnapshot
      ? await this.repoSurveyParticipantAttributeSnapshot.findOne(
          { snapshotId: publication.snapshotId },
          { context: dsContext },
        )
      : null
    const surveyParticipantAttributeLanguageSnapshots = this
      .repoSurveyParticipantAttributeLanguageSnapshot
      ? await this.repoSurveyParticipantAttributeLanguageSnapshot.find(
          { snapshotId: publication.snapshotId },
          { context: dsContext },
        )
      : []

    const embeddedFileEntries = await this.collectAnswerOptionFileEntries(
      snapshotData,
      surveyLanguageSnapshots,
      dsContext,
    )
    const responseFileEntries = await this.collectResponseFileEntries(
      referencedResponseFileIds,
      dsContext,
    )

    return {
      publication,
      snapshot,
      snapshotData,
      surveyLanguageSnapshots,
      surveyParticipantAttributeSnapshot,
      surveyParticipantAttributeLanguageSnapshots,
      responseEntries,
      publicationId: options.publicationId,
      embeddedFileEntries,
      responseFileEntries,
    }
  }

  /**
   * Estimate the byte size of this publication's embedded answer-option
   * images (used by estimateExportSize; see asyncTransferSizeThreshold.ts).
   * Cheap: bounded by the number of images in the survey, not by response
   * count. Deliberately excludes response-embedded (fileUpload) files,
   * whose size scales with response volume and would require the same
   * per-response batch walk collect() does — estimated separately via a
   * response-count heuristic instead.
   */
  async estimateSize(
    context: EntityExportContext,
    options?: ExportOptions,
  ): Promise<number> {
    if (!options?.publicationId) return 0
    const dsContext = contextForProject(context.projectId)

    const publication = await this.repoSurveyPublication.findOne(
      { _id: options.publicationId },
      { context: dsContext },
    )
    if (!publication) return 0

    const snapshotData = await this.repoSurveySnapshot.findOne(
      { snapshotId: publication.snapshotId },
      { context: dsContext },
    )
    if (!snapshotData?.survey) return 0

    const surveyLanguageSnapshots = this.repoSurveyLanguageSnapshot
      ? await this.repoSurveyLanguageSnapshot.find(
          { snapshotId: publication.snapshotId },
          { context: dsContext },
        )
      : []

    const embeddedFileEntries = await this.collectAnswerOptionFileEntries(
      snapshotData,
      surveyLanguageSnapshots,
      dsContext,
    )

    return embeddedFileEntries.reduce((sum, entry) => sum + (entry.size ?? 0), 0)
  }

  makeBinaryFileStream(entry: {
    s3Key: string
    bucketType?: 'public' | 'private'
  }): () => Promise<Readable> {
    return async () => {
      const adaptor = createStorageAdaptor(this.storageConfig)
      const bucket =
        entry.bucketType === 'private'
          ? this.storageConfig.privateBucket
          : this.storageConfig.publicBucket
      try {
        const result = await adaptor.getObject({
          Bucket: bucket,
          Key: entry.s3Key,
        })
        return result.Body as Readable
      } catch {
        return Readable.from([])
      }
    }
  }

  private async collectAnswerOptionFileEntries(
    snapshotData: SurveySnapshot,
    languageSnapshots: SurveyLanguageSnapshot[],
    dsContext: DataSourceContext,
  ): Promise<EntityEmbeddedFileManifestEntry[]> {
    if (!this.storageConfig || !this.repoFile) return []

    const referencedFileIds = collectReferencedFileIds(
      snapshotData.survey ?? ({} as SurveySnapshot['survey']),
      languageSnapshots,
    )
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
          archiveEntryPath: `files/${record.imageSetId}/${variant.imageVariant}.jpg`,
          answerOptionId: undefined,
          fileContext: variant.fileContext ?? 'survey',
          imageSetId: record.imageSetId,
          imageVariant: variant.imageVariant as 'original' | 'edited' | 'thumb',
        })
      }
    }

    return entries
  }

  private async collectResponseFileEntries(
    referencedFileIds: Set<string>,
    dsContext: DataSourceContext,
  ): Promise<ResponseFileManifestEntry[]> {
    if (!this.repoFile || referencedFileIds.size === 0) return []

    if (referencedFileIds.size > MAX_RESPONSE_EXPORT_FILE_COUNT) {
      throw new ServerErrorBadRequest({
        message: `This export would bundle ${referencedFileIds.size} response files, exceeding the ${MAX_RESPONSE_EXPORT_FILE_COUNT} limit for a single export. Contact support to arrange an alternative.`,
      })
    }

    const entries: ResponseFileManifestEntry[] = []
    let totalSize = 0

    for (const fileId of referencedFileIds) {
      const file = await this.repoFile.findOne(
        { _id: fileId, deletedAt: null },
        { context: dsContext },
      )
      if (!file || !file.responseId) continue

      totalSize += file.size ?? 0
      if (totalSize > MAX_RESPONSE_EXPORT_TOTAL_SIZE) {
        throw new ServerErrorBadRequest({
          message: `This export's response files exceed the ${MAX_RESPONSE_EXPORT_TOTAL_SIZE} byte total size limit for a single export. Contact support to arrange an alternative.`,
        })
      }

      const ext = extname(file.filename) || ''
      const bucket = responseFileBucket(file.responseId)
      entries.push({
        fileId: file._id,
        filename: file.filename,
        s3Key: file.filePath,
        mimeType: file.mimeType,
        hash: file.hash,
        size: file.size,
        bucket,
        archiveEntryPath: `files/response/${bucket}/${file._id}${ext}`,
        bucketType: file.bucketType || 'public',
      })
    }

    return entries
  }
}
