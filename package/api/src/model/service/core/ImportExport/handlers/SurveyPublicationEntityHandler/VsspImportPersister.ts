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
  ): Promise<{ entityId: string; hasIdTranslations?: boolean }> {
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

    await this.uploadBinaryFiles(fileResolutions, parsedData, dsContext)

    const fileIdMap = this.buildFileIdMap(fileResolutions)
    const remappedSnapshotData = this.remapper.remap(
      snapshotData,
      fileIdMap,
      imageSetIdMap ?? {},
      resolvedSurveyId,
      projectId,
    )

    let hadResponseIdCollision: boolean

    await this.repoSurveyResponse.transaction(dsContext, async (dsContext) => {
      ;({ hadResponseIdCollision } = await this.runTransaction(
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
        },
        { userId, dsContext, projectId },
      ))
    })

    return {
      entityId: resolvedSurveyId,
      hasIdTranslations: hadResponseIdCollision,
    }
  }

  private async uploadBinaryFiles(
    fileResolutions: FileResolution[],
    parsedData: EntityParsedData,
    dsContext: DataSourceContext,
  ): Promise<void> {
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
      const tempKey = parsedData.getBinaryS3Key(r.manifestEntry.archiveEntryPath)
      if (!tempKey) continue
      await adaptor.copyObject({
        Bucket: this.storageConfig.publicBucket,
        Key: r.newFilePath,
        CopySource: `${this.storageConfig.privateBucket}/${tempKey}`,
        ContentType: r.manifestEntry.mimeType,
      })
    }
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
   * than creating a duplicate. Returns `undefined` when there is nothing to
   * remap, so the caller can fall back to the original `answers` unchanged.
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
  ): Promise<Record<string, unknown> | undefined> {
    if (!answers || !this.repoFile || !this.storageConfig) return undefined

    const referencedIds = new Set<string>()
    for (const value of Object.values(answers)) {
      const fileIds = (value as { fileIds?: unknown } | null)?.fileIds
      if (Array.isArray(fileIds)) {
        for (const id of fileIds) if (typeof id === 'string') referencedIds.add(id)
      }
    }
    if (referencedIds.size === 0) return undefined

    const entryById = new Map(
      responseFileEntries.map((entry) => [entry.fileId, entry]),
    )
    const { userId, dsContext, projectId, parsedData } = ctx
    const adaptor = createStorageAdaptor(this.storageConfig)
    const resolvedIdMap: Record<string, string> = {}

    for (const oldFileId of referencedIds) {
      const entry = entryById.get(oldFileId)
      if (!entry) continue // not a bundled file — leave the id as-is

      const existing = await this.repoFile.findOne(
        {
          surveyId: resolvedSurveyId,
          hash: entry.hash,
          fileContext: 'response',
          deletedAt: null,
        },
        { context: dsContext },
      )
      if (existing) {
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
      if (tempKey) {
        await adaptor.copyObject({
          Bucket:
            bucketType === 'private'
              ? this.storageConfig.privateBucket
              : this.storageConfig.publicBucket,
          Key: newFilePath,
          CopySource: `${this.storageConfig.privateBucket}/${tempKey}`,
          ContentType: entry.mimeType,
        })
      }

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
    return remapped
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
    },
    ctx: { userId: string; dsContext: DataSourceContext; projectId: string },
  ): Promise<{ hadResponseIdCollision: boolean }> {
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

        const remappedAnswers = await this.persistResponseFiles(
          responseData.answers as Record<string, unknown> | undefined,
          responseFileEntries,
          resolvedSurveyId,
          newId,
          { userId, dsContext, projectId, parsedData },
        )

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

    return { hadResponseIdCollision }
  }
}
