import MzenId from 'mzen-id'
import { DataSourceContext } from 'mzen-om'

import { generateImageSetBasePath } from 'common'
import {
  RepoSurvey,
  RepoSurveySnapshotPartial,
  RepoSurveyPublication,
  RepoFile,
} from 'model'
import { AclContext } from 'model/entity/AclContext'

import { ImportValidationResult } from '../../EntityHandlerInterface'
import {
  FileResolution,
  StructuralSurveyJson,
  VsspParsedBundle,
  ResolvedImportContext,
} from './types'

export class VsspImportResolver {
  constructor(
    private repoSurvey: RepoSurvey,
    private repoSurveySnapshotPartial: RepoSurveySnapshotPartial,
    private repoSurveyPublication: RepoSurveyPublication,
    private repoFile?: RepoFile,
  ) {}

  async resolve(
    data: VsspParsedBundle,
    options: {
      force?: boolean
      projectId: string
      aclContext: AclContext
      surveyId?: string
    },
  ): Promise<ImportValidationResult<ResolvedImportContext>> {
    const { projectId, surveyId: optSurveyId } = options

    if (!optSurveyId) {
      return {
        valid: false,
        errors: [
          {
            message:
              'A publication (.vssp) file can only be imported into an existing survey; surveyId is required',
          },
        ],
      }
    }

    const dsContext = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })

    const existingSurvey = await this.repoSurvey.findOne(
      { _id: optSurveyId },
      { context: dsContext },
    )
    if (!existingSurvey) {
      return {
        valid: false,
        errors: [
          {
            message: `Survey with id "${optSurveyId}" does not exist; a publication (.vssp) file can only be imported into an existing survey`,
          },
        ],
      }
    }

    const resolvedSurveyId = optSurveyId
    const createSurvey = false
    const surveyDataForCreate: StructuralSurveyJson | null = null

    const { resolvedSnapshotId, createSnapshot } = await this.resolveSnapshot(
      data,
      resolvedSurveyId,
      createSurvey,
      dsContext,
    )

    const { resolvedPublicationId } = await this.resolvePublication(
      data,
      createSurvey,
      dsContext,
    )

    const { fileResolutions, imageSetIdMap } = await this.resolveFiles(
      data,
      resolvedSurveyId,
      projectId,
      dsContext,
    )

    const hasIdTranslations =
      createSurvey ||
      createSnapshot ||
      resolvedPublicationId !== data.publication._id

    return {
      valid: true,
      data: {
        ...data,
        resolvedSurveyId,
        createSurvey,
        surveyDataForCreate,
        resolvedSnapshotId,
        createSnapshot,
        resolvedPublicationId,
        fileResolutions,
        imageSetIdMap,
      },
      hasIdTranslations,
    }
  }

  private async resolveSnapshot(
    data: VsspParsedBundle,
    resolvedSurveyId: string,
    createSurvey: boolean,
    dsContext: DataSourceContext,
  ): Promise<{ resolvedSnapshotId: string; createSnapshot: boolean }> {
    if (createSurvey) {
      return { resolvedSnapshotId: MzenId(), createSnapshot: true }
    }

    const contentHash = data.snapshot?.contentHash
    if (!contentHash) {
      return { resolvedSnapshotId: MzenId(), createSnapshot: true }
    }

    const existingSnapshot = await this.repoSurveySnapshotPartial.findOne(
      { surveyId: resolvedSurveyId, contentHash },
      { context: dsContext },
    )

    if (existingSnapshot) {
      return { resolvedSnapshotId: existingSnapshot._id, createSnapshot: false }
    }

    return { resolvedSnapshotId: MzenId(), createSnapshot: true }
  }

  private async resolvePublication(
    data: VsspParsedBundle,
    createSurvey: boolean,
    dsContext: DataSourceContext,
  ): Promise<{ resolvedPublicationId: string }> {
    if (createSurvey) {
      return { resolvedPublicationId: MzenId() }
    }

    const existingPublication = await this.repoSurveyPublication.findOne(
      { _id: data.publication._id },
      { context: dsContext },
    )

    return {
      resolvedPublicationId: existingPublication
        ? MzenId()
        : data.publication._id,
    }
  }

  private async resolveFiles(
    data: VsspParsedBundle,
    resolvedSurveyId: string,
    projectId: string,
    dsContext: DataSourceContext,
  ): Promise<{
    fileResolutions: FileResolution[]
    imageSetIdMap: Record<string, string>
  }> {
    const fileResolutions: FileResolution[] = []
    const imageSetIdMap: Record<string, string> = {}

    if (!this.repoFile) {
      return { fileResolutions, imageSetIdMap }
    }

    const dedupedSets = new Set<string>()

    // Pass 1: edited variants — build imageSetIdMap, handle dedup/resurrection
    for (const entry of (data.embeddedFileEntries ?? []).filter(
      (e) => e.imageVariant === 'edited',
    )) {
      const newImageSetId = entry.hash ? entry.hash.substring(0, 16) : MzenId()
      imageSetIdMap[entry.imageSetId] = newImageSetId

      const existing = await this.repoFile.findOne(
        {
          imageSetId: newImageSetId,
          imageVariant: 'edited',
          surveyId: resolvedSurveyId,
          fileContext: entry.fileContext ?? 'survey',
          // no deleted filter — include soft-deleted for resurrection
        },
        { context: dsContext },
      )

      if (existing) {
        const allVariants = await this.repoFile.find(
          { imageSetId: newImageSetId },
          { context: dsContext },
        )
        for (const variant of allVariants) {
          fileResolutions.push({
            existingFileId: variant._id,
            newFileId: variant._id,
            newFilePath: variant.filePath,
            imageSetId: newImageSetId,
            imageVariant: variant.imageVariant as
              'original' | 'edited' | 'thumb',
            resurrect: !!variant.deletedAt,
          })
        }
        dedupedSets.add(newImageSetId)
        continue
      }

      const newFilePath =
        generateImageSetBasePath(newImageSetId, {
          projectId,
          surveyId: resolvedSurveyId,
          fileContext: entry.fileContext ?? 'survey',
        }) + '/edited.jpg'
      fileResolutions.push({
        manifestEntry: entry,
        existingFileId: null,
        newFileId: MzenId(),
        newFilePath,
        imageSetId: newImageSetId,
        imageVariant: 'edited',
        resurrect: false,
      })
    }

    // Pass 2: original and thumb variants
    for (const entry of (data.embeddedFileEntries ?? []).filter(
      (e) => e.imageVariant !== 'edited',
    )) {
      const resolvedSetId = imageSetIdMap[entry.imageSetId]
      if (!resolvedSetId) continue
      if (dedupedSets.has(resolvedSetId)) continue

      const newFilePath =
        generateImageSetBasePath(resolvedSetId, {
          projectId,
          surveyId: resolvedSurveyId,
          fileContext: entry.fileContext ?? 'survey',
        }) +
        '/' +
        entry.imageVariant +
        '.jpg'
      fileResolutions.push({
        manifestEntry: entry,
        existingFileId: null,
        newFileId: MzenId(),
        newFilePath,
        imageSetId: resolvedSetId,
        imageVariant: entry.imageVariant,
        resurrect: false,
      })
    }

    return { fileResolutions, imageSetIdMap }
  }
}
