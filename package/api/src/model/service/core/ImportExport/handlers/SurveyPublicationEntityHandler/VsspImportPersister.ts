import MzenId from 'mzen-id'
import { DataSourceContext } from 'mzen-om'
import {
  Survey,
  SurveyLanguage,
  SurveyLanguageSnapshot,
  SurveyParticipantAttributeSnapshot,
  SurveyParticipantAttributeLanguageSnapshot,
  SurveyQuestion,
  SurveyQuestionData,
  SurveySection,
  SurveySnapshotPartial,
  SurveySnapshot,
  SurveyPublication,
  SurveyParticipant,
  SurveyResponse,
  File,
} from 'veysur-common'
import { generateSurveyLanguageHash } from 'veysur-common/util/generateSurveyHash'

import {
  createStorageAdaptor,
  contextForProject,
  generateFilePath,
  generateStoredFilename,
} from 'common'
import {
  RepoSurveyLanguageSnapshot,
  RepoSurveyParticipantAttributeSnapshot,
  RepoSurveyParticipantAttributeLanguageSnapshot,
  RepoSurveyPublication,
  RepoSurveyResponse,
  RepoSurveySnapshot,
  RepoSurveySnapshotPartial,
  RepoSurveyParticipant,
  RepoSurveyElement,
  RepoSurveySection,
  RepoFile,
  RepoSurvey,
} from 'model'
import { StorageConfig } from 'model/service/core/ServiceFile/FileS3Config'

import {
  EntityParsedData,
  PersistImportContext,
} from '../../EntityHandlerInterface'
import {
  FileResolution,
  RawJson,
  ResolvedImportContext,
  ResponseBatchEnvelope,
  ResponseFileManifestEntry,
  StructuralSurveyJson,
} from './types'
import { SnapshotDataRemapper, SnapshotDataJson } from './SnapshotDataRemapper'
import { entityStamp } from '../util/entityStamp'

export class VsspImportPersister {
  constructor(
    private repoSurveyResponse: RepoSurveyResponse,
    private repoSurveyPublication: RepoSurveyPublication,
    private repoSurveySnapshot: RepoSurveySnapshot,
    private repoSurveySnapshotPartial: RepoSurveySnapshotPartial,
    private repoSurvey: RepoSurvey,
    private repoSurveyParticipant: RepoSurveyParticipant,
    private repoSurveyElement: RepoSurveyElement,
    private repoSurveySection: RepoSurveySection,
    private remapper: SnapshotDataRemapper,
    private repoSurveyLanguageSnapshot?: RepoSurveyLanguageSnapshot,
    private repoFile?: RepoFile,
    private storageConfig?: StorageConfig,
    private repoSurveyParticipantAttributeSnapshot?: RepoSurveyParticipantAttributeSnapshot,
    private repoSurveyParticipantAttributeLanguageSnapshot?: RepoSurveyParticipantAttributeLanguageSnapshot,
  ) {}

  async persist(
    data: ResolvedImportContext,
    context: PersistImportContext,
  ): Promise<{
    entityId: string
    hasIdTranslations?: boolean
    warnings?: unknown[]
  }> {
    const { projectId, aclContext } = context
    const userId = aclContext.jwt._id

    const dsContext = contextForProject(projectId)

    const {
      publication,
      snapshotData,
      snapshot,
      surveyLanguageSnapshots = [],
      surveyParticipantAttributeSnapshot = null,
      surveyParticipantAttributeLanguageSnapshots = [],
      responseBatchKeys,
      resolvedSurveyId,
      createSurvey,
      surveyDataForCreate,
      resolvedSnapshotId,
      createSnapshot,
      resolvedPublicationId,
      fileResolutions,
      imageSetIdMap,
      responseFileEntries = [],
      parsedData,
    } = data

    const unrestoredFileIds = await this.uploadBinaryFiles(
      fileResolutions,
      parsedData,
      dsContext,
    )

    const fileIdMap = this.buildFileIdMap(fileResolutions)
    const remappedSnapshotData = this.remapper.remap(
      snapshotData,
      fileIdMap,
      imageSetIdMap ?? {},
      resolvedSurveyId,
      projectId,
    )

    let hadResponseIdCollision: boolean
    let unrestoredResponseFileNames: string[]

    await this.repoSurveyResponse.transaction(dsContext, async (dsContext) => {
      ;({ hadResponseIdCollision, unrestoredResponseFileNames } =
        await this.runTransaction(
          {
            createSurvey,
            surveyDataForCreate,
            createSnapshot,
            publication,
            snapshot,
            surveyLanguageSnapshots,
            surveyParticipantAttributeSnapshot,
            surveyParticipantAttributeLanguageSnapshots,
            responseBatchKeys,
            resolvedSurveyId,
            resolvedSnapshotId,
            resolvedPublicationId,
            fileResolutions,
            remappedSnapshotData,
            responseFileEntries,
            parsedData,
            unrestoredFileIds,
          },
          { userId, dsContext, projectId },
        ))
    })

    const warnings: unknown[] = []
    if (unrestoredFileIds.size > 0) {
      const names = (fileResolutions ?? [])
        .filter((r) => unrestoredFileIds.has(r.newFileId))
        .map((r) => r.manifestEntry?.filename)
        .filter(Boolean)
      warnings.push({
        message: `${unrestoredFileIds.size} embedded image(s) could not be restored from the archive and were skipped: ${names.join(', ')}`,
      })
    }
    if (unrestoredResponseFileNames.length > 0) {
      warnings.push({
        message: `${unrestoredResponseFileNames.length} response file(s) could not be restored from the archive and were skipped: ${unrestoredResponseFileNames.join(', ')}`,
      })
    }

    return {
      entityId: resolvedSurveyId,
      hasIdTranslations: hadResponseIdCollision,
      ...(warnings.length > 0 ? { warnings } : {}),
    }
  }

  /**
   * Copies each new (non-dedup, non-resurrect) file's bytes from its temp
   * archive location to its final storage path. Returns the `newFileId`s
   * whose archive entry could not be located (`getBinaryS3Key` came back
   * empty) — the caller must not create a `File` record for these, since
   * without a copy that record would point at a path that was never
   * written. See `SurveyEntityHandler/VsstImportPersister.ts`'s
   * `uploadBinaryFiles` for the same pattern applied to template-level
   * images.
   */
  private async uploadBinaryFiles(
    fileResolutions: FileResolution[],
    parsedData: EntityParsedData,
    dsContext: DataSourceContext,
  ): Promise<Set<string>> {
    const unrestoredFileIds = new Set<string>()
    const adaptor =
      this.storageConfig && this.repoFile
        ? createStorageAdaptor(this.storageConfig)
        : null

    for (const r of fileResolutions ?? []) {
      if (r.existingFileId && r.resurrect && this.repoFile) {
        await this.repoFile.updateOne(
          { _id: r.existingFileId },
          { $set: { deletedAt: null } },
          { context: dsContext },
        )
        continue
      }
      if (r.existingFileId || !adaptor || !r.manifestEntry) continue
      const tempKey = parsedData.getBinaryS3Key(
        r.manifestEntry.archiveEntryPath,
      )
      if (!tempKey) {
        unrestoredFileIds.add(r.newFileId)
        continue
      }
      await adaptor.copyObject({
        Bucket: this.storageConfig.publicBucket,
        Key: r.newFilePath,
        CopySource: `${this.storageConfig.privateBucket}/${tempKey}`,
        ContentType: r.manifestEntry.mimeType,
      })
    }

    return unrestoredFileIds
  }

  /**
   * Remaps fileUpload-question answer fileIds in `answers` from their
   * source-archive ids to ids valid in the importing project/survey,
   * creating a `File` record (and copying its bytes) for each one not
   * already present. Dedup is scoped to `(surveyId, hash, fileContext:
   * 'response')` — deliberately broader than the per-response scoping
   * `ServiceFileUpload` uses at upload time, so a re-import of the same
   * archive (or a file whose bytes match one already imported for a
   * different response in this survey) reuses the existing record rather
   * than creating a duplicate. The dedup lookup deliberately omits a
   * `deletedAt` filter and resurrects (clears `deletedAt`) a soft-deleted
   * match rather than creating a new record — mirrors the `resurrect`
   * handling `VsspImportResolver.resolveFiles` already does for embedded
   * answer-option images. This matters when re-importing into the same
   * (reused) surveyId: a file soft-deleted from the survey after the export
   * was taken is still a valid restore target, not a genuinely-missing one.
   * Returns `answers: undefined` when there is nothing to remap, so the
   * caller can fall back to the original `answers` unchanged; always
   * returns `unrestoredFilenames` (possibly empty) for entries whose
   * archive entry could not be located — these are left unmapped (the
   * original archive fileId stays in place, pointing at nothing in the
   * importing project) rather than creating a `File` record for bytes that
   * were never copied.
   */
  private async persistResponseFiles(
    answers: Record<string, unknown> | undefined,
    responseFileEntries: ResponseFileManifestEntry[],
    resolvedSurveyId: string,
    newResponseId: string,
    ctx: {
      userId: string
      dsContext: DataSourceContext
      projectId: string
      parsedData: EntityParsedData
    },
  ): Promise<{
    answers: Record<string, unknown> | undefined
    unrestoredFilenames: string[]
  }> {
    if (!answers || !this.repoFile || !this.storageConfig) {
      return { answers: undefined, unrestoredFilenames: [] }
    }

    const referencedIds = new Set<string>()
    for (const value of Object.values(answers)) {
      const fileIds = (value as { fileIds?: unknown } | null)?.fileIds
      if (Array.isArray(fileIds)) {
        for (const id of fileIds)
          if (typeof id === 'string') referencedIds.add(id)
      }
    }
    if (referencedIds.size === 0) {
      return { answers: undefined, unrestoredFilenames: [] }
    }

    const entryById = new Map(
      responseFileEntries.map((entry) => [entry.fileId, entry]),
    )
    const { userId, dsContext, projectId, parsedData } = ctx
    const adaptor = createStorageAdaptor(this.storageConfig)
    const resolvedIdMap: Record<string, string> = {}
    const unrestoredFilenames: string[] = []

    for (const oldFileId of referencedIds) {
      const entry = entryById.get(oldFileId)
      if (!entry) continue // not a bundled file — leave the id as-is

      const existing = await this.repoFile.findOne(
        {
          surveyId: resolvedSurveyId,
          hash: entry.hash,
          fileContext: 'response',
          // no deleted filter — include soft-deleted for resurrection
        },
        { context: dsContext },
      )
      if (existing) {
        if (existing.deletedAt) {
          await this.repoFile.updateOne(
            { _id: existing._id },
            { $set: { deletedAt: null, responseId: newResponseId } },
            { context: dsContext },
          )
        }
        resolvedIdMap[oldFileId] = existing._id
        continue
      }

      const newFileId = MzenId()
      const storedFilename = generateStoredFilename(
        entry.filename,
        entry.hash ?? newFileId,
      )
      const newFilePath = generateFilePath(projectId, storedFilename, {
        surveyId: resolvedSurveyId,
        responseId: newResponseId,
        fileContext: 'response',
      })

      const bucketType = entry.bucketType || 'public'
      const tempKey = parsedData.getBinaryS3Key(entry.archiveEntryPath)
      if (!tempKey) {
        unrestoredFilenames.push(entry.filename)
        continue // no bytes to restore — do not create a File record
      }
      await adaptor.copyObject({
        Bucket:
          bucketType === 'private'
            ? this.storageConfig.privateBucket
            : this.storageConfig.publicBucket,
        Key: newFilePath,
        CopySource: `${this.storageConfig.privateBucket}/${tempKey}`,
        ContentType: entry.mimeType,
      })

      await this.repoFile.create(
        new File({
          _id: newFileId,
          filename: entry.filename,
          storedFilename,
          hash: entry.hash,
          size: entry.size,
          mimeType: entry.mimeType,
          filePath: newFilePath,
          uploadedAt: new Date(),
          createdById: userId,
          surveyId: resolvedSurveyId,
          responseId: newResponseId,
          fileContext: 'response',
          bucketType,
        }),
        { context: dsContext },
      )
      resolvedIdMap[oldFileId] = newFileId
    }

    const remapped: Record<string, unknown> = { ...answers }
    for (const [code, value] of Object.entries(answers)) {
      const fileIds = (value as { fileIds?: unknown } | null)?.fileIds
      if (!Array.isArray(fileIds)) continue
      remapped[code] = {
        ...(value as Record<string, unknown>),
        fileIds: fileIds.map((id) =>
          typeof id === 'string' ? (resolvedIdMap[id] ?? id) : id,
        ),
      }
    }
    return { answers: remapped, unrestoredFilenames }
  }

  private buildFileIdMap(
    fileResolutions: FileResolution[],
  ): Record<string, { newFileId: string; newFilePath: string }> {
    const fileIdMap: Record<
      string,
      { newFileId: string; newFilePath: string }
    > = {}
    for (const r of fileResolutions ?? []) {
      if (r.manifestEntry?.fileId) {
        fileIdMap[r.manifestEntry.fileId] = {
          newFileId: r.newFileId,
          newFilePath: r.newFilePath,
        }
      }
    }
    return fileIdMap
  }

  private async runTransaction(
    payload: {
      createSurvey: boolean
      surveyDataForCreate: StructuralSurveyJson
      createSnapshot: boolean
      publication: RawJson
      snapshot: RawJson
      surveyLanguageSnapshots: RawJson[]
      surveyParticipantAttributeSnapshot: RawJson | null
      surveyParticipantAttributeLanguageSnapshots: RawJson[]
      responseBatchKeys: string[]
      resolvedSurveyId: string
      resolvedSnapshotId: string
      resolvedPublicationId: string
      fileResolutions: FileResolution[]
      remappedSnapshotData: SnapshotDataJson
      responseFileEntries: ResponseFileManifestEntry[]
      parsedData: EntityParsedData
      unrestoredFileIds: Set<string>
    },
    ctx: { userId: string; dsContext: DataSourceContext; projectId: string },
  ): Promise<{
    hadResponseIdCollision: boolean
    unrestoredResponseFileNames: string[]
  }> {
    const {
      createSurvey,
      surveyDataForCreate,
      createSnapshot,
      publication,
      snapshot,
      surveyLanguageSnapshots,
      surveyParticipantAttributeSnapshot,
      surveyParticipantAttributeLanguageSnapshots,
      responseBatchKeys,
      resolvedSurveyId,
      resolvedSnapshotId,
      resolvedPublicationId,
      fileResolutions,
      remappedSnapshotData,
      responseFileEntries,
      parsedData,
      unrestoredFileIds,
    } = payload
    const { userId, dsContext, projectId } = ctx

    if (createSurvey) {
      const sectionIdMap: Record<string, string> = {}
      for (const sectionData of surveyDataForCreate.sections ?? []) {
        sectionIdMap[sectionData._id] = MzenId()
      }

      const elementIdMap: Record<string, string> = {}
      for (const elementData of surveyDataForCreate.elements ?? []) {
        elementIdMap[elementData._id] = MzenId()
      }

      const survey = new Survey({
        ...surveyDataForCreate,
        _id: resolvedSurveyId,
        ...entityStamp(userId),
        sections: [],
        elements: [],
        sectionIds: (surveyDataForCreate.sectionIds ?? []).map(
          (id) => sectionIdMap[id] ?? id,
        ),
        elementIds: (surveyDataForCreate.elementIds ?? []).map(
          (id) => elementIdMap[id] ?? id,
        ),
      })
      await this.repoSurvey.insertOne(survey, { context: dsContext })

      for (const sectionData of surveyDataForCreate.sections ?? []) {
        const section = new SurveySection({
          ...sectionData,
          _id: sectionIdMap[sectionData._id],
          surveyId: resolvedSurveyId,
          ...entityStamp(userId),
        } as ConstructorParameters<typeof SurveySection>[0])
        await this.repoSurveySection.insertOne(section, {
          context: dsContext,
        })
      }

      for (const elementData of remappedSnapshotData.survey?.elements ?? []) {
        const sourceSectionId = elementData.sectionId
        const element = new SurveyQuestion({
          ...elementData,
          _id: elementIdMap[elementData._id],
          sectionId: sectionIdMap[sourceSectionId] ?? sourceSectionId,
          surveyId: resolvedSurveyId,
          ...entityStamp(userId),
        } as Partial<SurveyQuestionData>)
        await this.repoSurveyElement.insertOne(element, {
          context: dsContext,
        })
      }
    }

    if (createSnapshot) {
      const snapshotRecord = new SurveySnapshotPartial({
        _id: resolvedSnapshotId,
        surveyId: resolvedSurveyId,
        createdById: userId,
        contentHash: snapshot?.contentHash ?? null,
        label: snapshot?.label ?? null,
        notes: snapshot?.notes ?? null,
        surveyPartial: remappedSnapshotData.survey,
        createdAt: snapshot?.createdAt
          ? new Date(snapshot.createdAt as string)
          : new Date(),
        updatedAt: new Date(),
      })
      await this.repoSurveySnapshotPartial.insertOne(snapshotRecord, {
        context: dsContext,
      })

      const snapshotDataRecord = new SurveySnapshot({
        _id: MzenId(),
        snapshotId: resolvedSnapshotId,
        survey: remappedSnapshotData.survey,
      })
      await this.repoSurveySnapshot.insertOne(snapshotDataRecord, {
        context: dsContext,
      })

      if (this.repoSurveyLanguageSnapshot) {
        for (const langData of surveyLanguageSnapshots ?? []) {
          const data =
            remappedSnapshotData.surveyLanguageSnapshots?.find(
              (l) => l.languageCode === langData.languageCode,
            )?.data ??
            langData.data ??
            {}

          const langSnapshot = new SurveyLanguageSnapshot({
            _id: MzenId(),
            snapshotId: resolvedSnapshotId,
            surveyId: resolvedSurveyId,
            languageCode: langData.languageCode,
            // Regenerate hash from imported data — do not trust archived hash
            // (only `.data` is read by generateSurveyLanguageHash)
            contentHash: generateSurveyLanguageHash({
              languageCode: langData.languageCode,
              data,
            } as SurveyLanguage),
            data,
          })
          await this.repoSurveyLanguageSnapshot.insertOne(langSnapshot, {
            context: dsContext,
          })
        }
      }

      if (
        this.repoSurveyParticipantAttributeSnapshot &&
        surveyParticipantAttributeSnapshot
      ) {
        const attrSnapshotRecord = new SurveyParticipantAttributeSnapshot({
          ...surveyParticipantAttributeSnapshot,
          _id: MzenId(),
          snapshotId: resolvedSnapshotId,
          surveyId: resolvedSurveyId,
        })
        await this.repoSurveyParticipantAttributeSnapshot.insertOne(
          attrSnapshotRecord,
          { context: dsContext },
        )
      }

      if (this.repoSurveyParticipantAttributeLanguageSnapshot) {
        for (const attrLangData of surveyParticipantAttributeLanguageSnapshots ??
          []) {
          const attrLangRecord = new SurveyParticipantAttributeLanguageSnapshot(
            {
              ...attrLangData,
              _id: MzenId(),
              snapshotId: resolvedSnapshotId,
              surveyId: resolvedSurveyId,
            },
          )
          await this.repoSurveyParticipantAttributeLanguageSnapshot.insertOne(
            attrLangRecord,
            { context: dsContext },
          )
        }
      }
    }

    // Imports must never arrive live — an active publication can only be
    // created via an explicit publish/republish action. Preserve the archive's
    // stop time if it was already stopped; otherwise stamp it stopped now.
    const importStopped = publication?.stoppedAt
      ? new Date(publication.stoppedAt as string)
      : new Date()

    const pub = new SurveyPublication({
      ...publication,
      _id: resolvedPublicationId,
      surveyId: resolvedSurveyId,
      snapshotId: resolvedSnapshotId,
      stoppedAt: importStopped,
    })
    await this.repoSurveyPublication.insertOne(pub, { context: dsContext })

    if (this.repoFile) {
      for (const r of fileResolutions ?? []) {
        if (r.existingFileId || !r.manifestEntry) continue
        if (unrestoredFileIds.has(r.newFileId)) continue
        await this.repoFile.create(
          new File({
            _id: r.newFileId,
            filename: r.manifestEntry.filename,
            storedFilename: r.manifestEntry.filename,
            hash: r.manifestEntry.hash,
            size: r.manifestEntry.size,
            mimeType: r.manifestEntry.mimeType,
            filePath: r.newFilePath,
            uploadedAt: new Date(),
            createdById: userId,
            surveyId: resolvedSurveyId,
            responseId: null,
            fileContext: r.manifestEntry.fileContext ?? 'survey',
            imageSetId: r.imageSetId,
            imageVariant: r.imageVariant,
            bucketType: 'public',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            refs: null,
          }),
          { context: dsContext },
        )
      }
    }

    const seenParticipantIds = new Set<string>()
    const participantIdMap: Record<string, string> = {}
    let hadResponseIdCollision = false
    const unrestoredResponseFileNames: string[] = []

    for (const batchKey of responseBatchKeys) {
      const batchData =
        (parsedData.getJson(batchKey) as ResponseBatchEnvelope | null)
          ?.responses ?? []

      // Pass 1: resolve + insert participants for this batch
      for (const response of batchData) {
        if (!response.participantId) continue
        if (seenParticipantIds.has(response.participantId)) continue
        seenParticipantIds.add(response.participantId)

        let resolvedId: string
        if (response.participant?.email) {
          const existing = await this.repoSurveyParticipant.findOne(
            { surveyId: resolvedSurveyId, email: response.participant.email },
            { context: dsContext },
          )
          if (existing) {
            resolvedId = existing._id
          } else {
            const participant = new SurveyParticipant({
              ...response.participant,
              _id: MzenId(),
              surveyId: resolvedSurveyId,
            })
            await this.repoSurveyParticipant.insertOne(participant, {
              context: dsContext,
            })
            resolvedId = participant._id
          }
        } else {
          const participant = new SurveyParticipant({
            ...(response.participant ?? {}),
            _id: MzenId(),
            surveyId: resolvedSurveyId,
          })
          await this.repoSurveyParticipant.insertOne(participant, {
            context: dsContext,
          })
          resolvedId = participant._id
        }
        participantIdMap[response.participantId] = resolvedId
      }

      // Pass 2: insert responses for this batch
      for (const responseData of batchData) {
        const existing = await this.repoSurveyResponse.findOne(
          { _id: responseData._id },
          { context: dsContext },
        )
        if (existing) hadResponseIdCollision = true
        const newId = existing ? MzenId() : responseData._id

        const newParticipantId = responseData.participantId
          ? (participantIdMap[responseData.participantId] ??
            responseData.participantId)
          : null

        const { answers: remappedAnswers, unrestoredFilenames } =
          await this.persistResponseFiles(
            responseData.answers as Record<string, unknown> | undefined,
            responseFileEntries,
            resolvedSurveyId,
            newId,
            { userId, dsContext, projectId, parsedData },
          )
        unrestoredResponseFileNames.push(...unrestoredFilenames)

        const response = new SurveyResponse({
          ...responseData,
          _id: newId,
          surveyId: resolvedSurveyId,
          snapshotId: resolvedSnapshotId,
          publicationId: resolvedPublicationId,
          participantId: newParticipantId,
          participant: undefined,
          answers: remappedAnswers ?? responseData.answers,
        })
        await this.repoSurveyResponse.insertOne(response, {
          context: dsContext,
        })
      }

      parsedData.deleteJson?.(batchKey)
    }

    return { hadResponseIdCollision, unrestoredResponseFileNames }
  }
}
