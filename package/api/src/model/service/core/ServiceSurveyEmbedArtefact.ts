import { Service } from '@datacapy/server'
import { DEFAULT_PROJECT_ID } from 'veysur-common'

import {
  RepoSurveyLanguageSnapshot,
  RepoSurveyPublication,
  RepoSurveySnapshot,
  RepoSurveySnapshotPartial,
} from 'model'
import {
  embedArtefactKey,
  embedPointerKey,
  embedSnapshotPrefix,
  embedSurveyPrefix,
  mergeSurveyLanguageSnapshots,
} from 'model/common'
import {
  contextForProject,
  createStorageAdaptor,
  deleteStorageObjectsByPrefix,
  objectExists,
} from 'common'
import { isSelfHosted } from 'config/edition'
import { getStorageConfig } from './ServiceFile/FileS3Config'

const POINTER_VERSION = 1

export class ServiceSurveyEmbedArtefact extends Service {
  constructor() {
    super({
      name: 'surveyEmbedArtefact',
    })
  }

  /**
   * Write the immutable per-language artefacts for the live snapshot, then the
   * pointer that names it. Only removes the pointer when the survey has no live
   * publication or its live snapshot does not allow embedding.
   */
  async write({
    surveyId,
    projectId,
  }: {
    surveyId: string
    projectId: string
  }) {
    const context = contextForProject(projectId)
    const publication = await this.getRepo<RepoSurveyPublication>(
      'surveyPublication',
    ).findOne({ surveyId, stoppedAt: null }, { context })

    if (!publication) {
      await this.removePointer({ surveyId, projectId })
      return
    }

    const snapshot = await this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    ).findOne({ _id: publication.snapshotId }, { context })
    const snapshotData = await this.getRepo<RepoSurveySnapshot>(
      'surveySnapshot',
    ).findOne({ snapshotId: publication.snapshotId }, { context })

    if (!snapshot || !snapshotData) {
      return
    }

    if (!snapshot.surveyPartial?.access?.embed) {
      await this.removePointer({ surveyId, projectId })
      return
    }

    const repoLanguage = this.getRepo<RepoSurveyLanguageSnapshot>(
      'surveyLanguageSnapshot',
    )
    const languageRows = await repoLanguage.find(
      { snapshotId: snapshot._id },
      { context },
    )
    const languages = languageRows.map((row) => row.languageCode)
    const defaultLanguage = snapshot.surveyPartial?.language?.default ?? null

    const { publicBucket } = getStorageConfig(this.config)
    const adaptor = createStorageAdaptor(getStorageConfig(this.config))

    for (const lang of languages) {
      const key = embedArtefactKey(projectId, surveyId, snapshot._id, lang)
      if (await objectExists(adaptor, publicBucket, key)) {
        continue
      }

      const survey = await mergeSurveyLanguageSnapshots(
        repoLanguage,
        snapshotData.survey,
        snapshot._id,
        Array.from(new Set([lang, defaultLanguage].filter(Boolean))),
        context,
      )

      await adaptor.putObject({
        Bucket: publicBucket,
        Key: key,
        Body: JSON.stringify({
          snapshot,
          snapshotData: { ...snapshotData, survey },
        }),
        ContentType: 'application/json',
      })
    }

    const participantSnapshot =
      this.modelManager.services.surveyParticipantSnapshot
    const settingSurveyData = await participantSnapshot.getGatedSettingSurvey(
      projectId,
      context,
    )

    await adaptor.putObject({
      Bucket: publicBucket,
      Key: embedPointerKey(projectId, surveyId),
      Body: JSON.stringify({
        version: POINTER_VERSION,
        surveyId,
        snapshotId: snapshot._id,
        publicationId: publication._id,
        writtenAt: new Date(),
        languages,
        defaultLanguage,
        access: snapshot.surveyPartial?.access,
        schedule: snapshot.surveyPartial?.schedule,
        noBrandAvailable: await participantSnapshot.isNoBrandAllowed(projectId),
        settingSurveyData,
      }),
      ContentType: 'application/json',
    })
  }

  // The callers' own work has already committed, so a storage failure here must
  // never fail it; the backfill task repairs a missing or stale artefact.
  async refresh(args: { surveyId: string; projectId: string }) {
    try {
      await this.write(args)
    } catch (error) {
      this.logger.warn(
        `Failed to write embed artefact for survey ${args.surveyId}: ${error.message}`,
      )
    }
  }

  // Live surveys of the project whose snapshot allows embedding.
  private async getEmbeddedSurveyIds(projectId: string): Promise<string[]> {
    const context = contextForProject(projectId)
    const publications = await this.getRepo<RepoSurveyPublication>(
      'surveyPublication',
    ).find({ stoppedAt: null }, { context })
    if (publications.length === 0) {
      return []
    }

    const snapshots = await this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    ).find({ _id: { $in: publications.map((p) => p.snapshotId) } }, { context })
    const embeddedSnapshotIds = new Set(
      snapshots
        .filter((snapshot) => snapshot.surveyPartial?.access?.embed)
        .map((snapshot) => snapshot._id),
    )

    return publications
      .filter((publication) => embeddedSnapshotIds.has(publication.snapshotId))
      .map((publication) => publication.surveyId)
  }

  // The pointer carries the project's live survey settings and branding
  // entitlement, so it goes stale when either changes. Only live, embed-enabled
  // surveys are touched.
  async refreshProject({ projectId }: { projectId: string }) {
    try {
      for (const surveyId of await this.getEmbeddedSurveyIds(projectId)) {
        await this.refresh({ surveyId, projectId })
      }
    } catch (error) {
      this.logger.warn(
        `Failed to refresh embed pointers for project ${projectId}: ${error.message}`,
      )
    }
  }

  // Scheduled task: rewrites missing artefacts and stale pointers for every
  // live, embed-enabled survey, which covers surveys published before embedding
  // existed and any publish-time write that failed.
  async repairAll(): Promise<{ repaired: number; failed: number }> {
    // Self-hosted has no `project` repo (a single, config-sourced project)
    const projects = isSelfHosted()
      ? [{ _id: DEFAULT_PROJECT_ID }]
      : ((await this.getRepo('project').find({})) as { _id: string }[])

    let repaired = 0
    let failed = 0

    for (const project of projects) {
      try {
        for (const surveyId of await this.getEmbeddedSurveyIds(project._id)) {
          try {
            await this.write({ surveyId, projectId: project._id })
            repaired++
          } catch (error) {
            failed++
            this.logger.warn(
              `Failed to repair embed artefact for survey ${surveyId}: ${error.message}`,
            )
          }
        }
      } catch (error) {
        failed++
        this.logger.warn(
          `Failed to repair embed artefacts for project ${project._id}: ${error.message}`,
        )
      }
    }

    return { repaired, failed }
  }

  async removeSnapshots({
    surveyId,
    projectId,
    snapshotIds,
  }: {
    surveyId: string
    projectId: string
    snapshotIds: string[]
  }) {
    try {
      const storageConfig = getStorageConfig(this.config)
      const adaptor = createStorageAdaptor(storageConfig)
      for (const snapshotId of snapshotIds) {
        await deleteStorageObjectsByPrefix(
          adaptor,
          storageConfig.publicBucket,
          embedSnapshotPrefix(projectId, surveyId, snapshotId),
        )
      }
    } catch (error) {
      this.logger.warn(
        `Failed to remove embed artefacts for survey ${surveyId}: ${error.message}`,
      )
    }
    await this.refresh({ surveyId, projectId })
  }

  async removeSurvey({
    surveyId,
    projectId,
  }: {
    surveyId: string
    projectId: string
  }) {
    try {
      const storageConfig = getStorageConfig(this.config)
      await deleteStorageObjectsByPrefix(
        createStorageAdaptor(storageConfig),
        storageConfig.publicBucket,
        embedSurveyPrefix(projectId, surveyId),
      )
    } catch (error) {
      this.logger.warn(
        `Failed to remove embed artefacts for survey ${surveyId}: ${error.message}`,
      )
    }
  }

  async removePointer({
    surveyId,
    projectId,
  }: {
    surveyId: string
    projectId: string
  }) {
    const storageConfig = getStorageConfig(this.config)
    await createStorageAdaptor(storageConfig).deleteObject({
      Bucket: storageConfig.publicBucket,
      Key: embedPointerKey(projectId, surveyId),
    })
  }
}

export default ServiceSurveyEmbedArtefact
