import { Readable } from 'stream'

import { DataSourceContext } from 'mzen-om'
import { ServerErrorNotFound } from 'mzen-server'
import { SurveySnapshot, SurveyLanguageSnapshot } from 'veysur-common'

import { createStorageAdaptor } from 'common'
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
import { buildResponseEnvelope } from '../util/buildResponseEnvelope'
import { RESPONSE_EXPORT_BATCH_SIZE } from '../util/responseExportBatch'

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
    const dsContext = DataSourceContext.fromDataSources({
      project: { lookupKey: context.projectId },
    })

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
    }
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
