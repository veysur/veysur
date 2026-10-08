import {
  Service,
  ServerErrorNotFound,
  ServerErrorInternal,
} from '@datacapy/server'
import {
  Survey,
  SurveyCompare,
  MergeOptions,
  MergeResult,
  mergeSurveyLanguageIntoSurvey,
} from 'veysur-common'

import { parsePaginationParams, contextForProject } from 'common'
import { mergeSurveyLanguageSnapshots } from 'model/common'
import {
  RepoSurvey,
  RepoSettingSurvey,
  RepoSurveyLanguage,
  RepoSurveyLanguageSnapshot,
  RepoSurveyParticipantAttribute,
  RepoSurveyParticipantAttributeSnapshot,
  RepoSurveyParticipantAttributeLanguage,
  RepoSurveyParticipantAttributeLanguageSnapshot,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  RepoSurveyResponse,
  RepoSurveyPublication,
} from 'model'

import { ServiceResponseMerge } from './ServiceResponseMerge'
import { FileReference } from './ServiceFile/FileReference'
import { ServiceFileDeletion } from './ServiceFile/ServiceFileDeletion'
import { RepoFile } from 'model'
import { AclConditions } from 'model/entity/AclContext'

export class ServiceSurveySnapshot extends Service {
  constructor() {
    super({
      name: 'surveySnapshot',
    })
  }

  /**
   * Extract all file IDs from survey data
   */
  private extractFileIdsFromSurvey(
    survey: Survey | null | undefined,
  ): string[] {
    const fileIds: string[] = []

    // NOTE: SurveyAnswerOption has no `.files` field — the historical shape
    // this function targeted no longer exists, so it always returns an
    // empty array. Preserved as dead code to avoid changing runtime
    // behaviour as part of a type-only cleanup.
    if (!survey || !survey.elements.questions()) {
      return fileIds
    }

    return fileIds
  }

  async getAll({ surveyId, projectId, page, perPage }) {
    const context = contextForProject(projectId)
    const pagination = parsePaginationParams(page, perPage, { perPage: 10 })
    page = pagination.page
    perPage = pagination.perPage

    const offset = (page - 1) * perPage

    const repo = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )

    const query = {
      surveyId,
    }

    const snapshotCount = await repo.count(query, { context })

    const snapshots = await repo.find(query, {
      context,
      fields: {
        survey: 0,
      },
      limit: perPage,
      sort: { createdAt: -1 },
      offset,
      populate: {
        createdBy: true,
        publications: true,
        responseCount: true,
      },
    })

    return { snapshots, snapshotCount }
  }

  async deleteMany({
    surveyId,
    snapshotIds,
    projectId,
    aclConditions: _aclConditions,
  }) {
    const context = contextForProject(projectId)
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const repoSurveySnapshot =
      this.getRepo<RepoSurveySnapshot>('surveySnapshot')
    const repoSurveyResponse =
      this.getRepo<RepoSurveyResponse>('surveyResponse')
    const repoSurveyPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')

    // Collect file IDs from each snapshot (populated inside the transaction, used after commit)
    const snapshotFileMap = new Map<string, string[]>()
    const allFileIdsSet = new Set<string>()

    await repoSurveySnapshotPartial.transaction(context, async (context) => {
      // Verify all snapshots exist and belong to the project
      const snapshots = await repoSurveySnapshotPartial.find(
        {
          _id: { $in: snapshotIds },
          surveyId,
        },
        { context },
      )

      if (snapshots.length !== snapshotIds.length) {
        throw new ServerErrorNotFound('One or more survey snapshots not found')
      }

      for (const snapshotId of snapshotIds) {
        const snapshotData = await repoSurveySnapshot.findOne(
          {
            snapshotId,
          },
          { context },
        )
        if (snapshotData) {
          const fileIds = this.extractFileIdsFromSurvey(snapshotData.survey)
          snapshotFileMap.set(snapshotId, fileIds)
          fileIds.forEach((fileId) => allFileIdsSet.add(fileId))
        }
      }

      // Stop any active publications for these snapshots
      await repoSurveyPublication.updateMany(
        {
          snapshotId: { $in: snapshotIds },
          stoppedAt: null,
        },
        {
          $set: {
            stoppedAt: new Date(),
          },
        },
        { context },
      )

      await repoSurveyResponse.deleteMany(
        {
          snapshotId: { $in: snapshotIds },
          surveyId,
        },
        { context },
      )

      await repoSurveySnapshot.deleteMany(
        {
          snapshotId: { $in: snapshotIds },
        },
        { context },
      )

      await this.getRepo<RepoSurveyLanguageSnapshot>(
        'surveyLanguageSnapshot',
      ).deleteMany({ snapshotId: { $in: snapshotIds } }, { context })

      await this.getRepo<RepoSurveyParticipantAttributeSnapshot>(
        'surveyParticipantAttributeSnapshot',
      ).deleteMany({ snapshotId: { $in: snapshotIds } }, { context })

      await this.getRepo<RepoSurveyParticipantAttributeLanguageSnapshot>(
        'surveyParticipantAttributeLanguageSnapshot',
      ).deleteMany({ snapshotId: { $in: snapshotIds } }, { context })

      await repoSurveySnapshotPartial.deleteMany(
        {
          _id: { $in: snapshotIds },
          surveyId,
        },
        { context },
      )
    })

    // Remove file references for each snapshot (outside the transaction)
    const repoFile = this.getRepo<RepoFile>('file')

    for (const snapshotId of snapshotIds) {
      const fileIds = snapshotFileMap.get(snapshotId) || []

      for (const fileId of fileIds) {
        try {
          await FileReference.removeFileReference(
            repoFile,
            fileId,
            'surveySnapshot',
            snapshotId,
            context,
          )
        } catch (error) {
          this.logger.warn(
            `Failed to remove reference for file ${fileId}: ${error.message}`,
          )
        }
      }
    }

    // Try to delete each unique file (will only succeed if no more references)
    const serviceFileDeletion =
      this.getService<ServiceFileDeletion>('fileDeletion')
    for (const fileId of allFileIdsSet) {
      try {
        await serviceFileDeletion.delete({ fileId, projectId })
      } catch (error) {
        // File still has references or other error - that's fine
        if (!error.message?.includes('referenced by other entities')) {
          this.logger.warn(`Could not delete file ${fileId}: ${error.message}`)
        }
      }
    }

    await this.modelManager.services.surveyEmbedArtefact.removeSnapshots({
      surveyId,
      projectId,
      snapshotIds,
    })

    return { success: true, deletedCount: snapshotIds.length }
  }

  async get({
    surveyId,
    snapshotId,
    projectId,
    aclConditions: _aclConditions,
  }) {
    const context = contextForProject(projectId)
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const repoSurveySnapshot =
      this.getRepo<RepoSurveySnapshot>('surveySnapshot')

    const snapshot = await repoSurveySnapshotPartial.findOne(
      {
        _id: snapshotId,
        surveyId,
      },
      {
        context,
        fields: {
          survey: 0,
        },
      },
    )

    if (!snapshot) {
      throw new ServerErrorNotFound('Survey snapshot not found')
    }

    // Load full survey data from RepoSurveySnapshotData
    const snapshotData = await repoSurveySnapshot.findOne(
      {
        snapshotId,
      },
      { context },
    )

    const defaultLang = snapshot.surveyPartial?.language?.default
    const repoSurveyLanguageSnapshot = this.getRepo<RepoSurveyLanguageSnapshot>(
      'surveyLanguageSnapshot',
    )
    const survey = await mergeSurveyLanguageSnapshots(
      repoSurveyLanguageSnapshot,
      snapshotData.survey,
      snapshotId,
      [defaultLang].filter(Boolean),
      context,
    )

    return { snapshot, snapshotData: { ...snapshotData, survey } }
  }

  async update({
    surveyId,
    snapshotId,
    projectId,
    label,
    notes,
    aclConditions: _aclConditions,
  }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )

    const snapshot = await repo.findOne(
      {
        _id: snapshotId,
        surveyId,
      },
      { context },
    )

    if (!snapshot) {
      throw new ServerErrorNotFound('Survey snapshot not found')
    }

    const updateData: { label?: string | null; notes?: string | null } = {}
    if (label !== undefined) {
      updateData.label = label
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    await repo.updateOne(
      {
        _id: snapshotId,
        surveyId,
      },
      {
        $set: updateData,
      },
      { context },
    )

    const updatedSnapshot = await repo.findOne(
      {
        _id: snapshotId,
        surveyId,
      },
      {
        context,
        fields: {
          survey: 0,
        },
      },
    )

    return { snapshot: updatedSnapshot }
  }

  async compare({
    surveyId,
    snapshotIdA,
    snapshotIdB,
    projectId,
    aclConditions: _aclConditions,
  }) {
    const context = contextForProject(projectId)
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const repoSurveySnapshot =
      this.getRepo<RepoSurveySnapshot>('surveySnapshot')
    const repoSurveyLanguageSnapshot = this.getRepo<RepoSurveyLanguageSnapshot>(
      'surveyLanguageSnapshot',
    )

    // Verify both snapshots exist and belong to the project
    const snapshotA = await repoSurveySnapshotPartial.findOne(
      {
        _id: snapshotIdA,
        surveyId,
      },
      { context },
    )

    if (!snapshotA) {
      throw new ServerErrorNotFound('First survey snapshot not found')
    }

    const snapshotB = await repoSurveySnapshotPartial.findOne(
      {
        _id: snapshotIdB,
        surveyId,
      },
      { context },
    )

    if (!snapshotB) {
      throw new ServerErrorNotFound('Second survey snapshot not found')
    }

    // Load full survey data for both snapshots
    const snapshotDataA = await repoSurveySnapshot.findOne(
      { snapshotId: snapshotIdA },
      { context },
    )

    if (!snapshotDataA) {
      throw new ServerErrorNotFound('First survey snapshot data not found')
    }

    const snapshotDataB = await repoSurveySnapshot.findOne(
      { snapshotId: snapshotIdB },
      { context },
    )

    if (!snapshotDataB) {
      throw new ServerErrorNotFound('Second survey snapshot data not found')
    }

    // Load all language snapshots for both sides and merge before compare
    const [langSnapshotsA, langSnapshotsB] = await Promise.all([
      repoSurveyLanguageSnapshot.find({ snapshotId: snapshotIdA }, { context }),
      repoSurveyLanguageSnapshot.find({ snapshotId: snapshotIdB }, { context }),
    ])

    const surveyA = langSnapshotsA.length
      ? mergeSurveyLanguageIntoSurvey(snapshotDataA.survey, langSnapshotsA)
      : snapshotDataA.survey
    const surveyB = langSnapshotsB.length
      ? mergeSurveyLanguageIntoSurvey(snapshotDataB.survey, langSnapshotsB)
      : snapshotDataB.survey

    // Load participant attributes from snapshot records
    const repoParticipantAttributeSnapshot =
      this.getRepo<RepoSurveyParticipantAttributeSnapshot>(
        'surveyParticipantAttributeSnapshot',
      )

    const [attrDocA, attrDocB] = await Promise.all([
      repoParticipantAttributeSnapshot.findOne(
        { snapshotId: snapshotIdA },
        { context },
      ),
      repoParticipantAttributeSnapshot.findOne(
        { snapshotId: snapshotIdB },
        { context },
      ),
    ])

    // Fall back to live data only for pre-migration snapshots that have no attribute snapshot record
    const repoSurveyParticipantAttribute =
      this.getRepo<RepoSurveyParticipantAttribute>('surveyParticipantAttribute')
    const participantAttributeDocFallback =
      attrDocA === null && attrDocB === null
        ? await repoSurveyParticipantAttribute.findOne(
            { surveyId },
            { context },
          )
        : null

    const participantAttributesA =
      attrDocA?.attributes ?? participantAttributeDocFallback?.attributes ?? []
    const participantAttributesB =
      attrDocB?.attributes ?? participantAttributeDocFallback?.attributes ?? []

    // Compare the surveys using SurveyCompare
    const surveyCompare = new SurveyCompare()
    const comparisonResult = surveyCompare.compare(
      surveyA,
      surveyB,
      participantAttributesA,
      participantAttributesB,
    )

    return {
      snapshotA: {
        _id: snapshotA._id,
        label: snapshotA.label,
        notes: snapshotA.notes,
        createdAt: snapshotA.createdAt,
      },
      snapshotB: {
        _id: snapshotB._id,
        label: snapshotB.label,
        notes: snapshotB.notes,
        createdAt: snapshotB.createdAt,
      },
      comparison: comparisonResult,
    }
  }

  /**
   * Find existing snapshot with matching content hash
   *
   * @param surveyId - Survey to search within
   * @param contentHash - Hash to match
   * @returns Snapshot if found, null otherwise
   */
  async findByContentHash(
    surveyId: string,
    contentHash: string,
    projectId: string,
  ) {
    const context = contextForProject(projectId)
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const repoSurveySnapshot =
      this.getRepo<RepoSurveySnapshot>('surveySnapshot')

    const snapshot = await repoSurveySnapshotPartial.findOne(
      {
        surveyId,
        contentHash,
      },
      {
        context,
        sort: { createdAt: -1 }, // Most recent first
      },
    )

    if (!snapshot) return null

    const snapshotData = await repoSurveySnapshot.findOne(
      {
        snapshotId: snapshot._id,
      },
      { context },
    )

    if (!snapshotData) return null

    return { snapshot, snapshotData }
  }

  async compareWithCurrent({
    surveyId,
    snapshotId,
    projectId,
    aclConditions: _aclConditions,
  }) {
    const context = contextForProject(projectId)
    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')
    const repoSurveyLanguage =
      this.getRepo<RepoSurveyLanguage>('surveyLanguage')
    const repoSurveyLanguageSnapshot = this.getRepo<RepoSurveyLanguageSnapshot>(
      'surveyLanguageSnapshot',
    )
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const repoSurveySnapshot =
      this.getRepo<RepoSurveySnapshot>('surveySnapshot')

    // Load the current editing survey state
    const currentSurvey = await repoSurvey.findOne(
      {
        _id: surveyId,
      },
      {
        context,
        populate: {
          elements: true,
          sections: true,
        },
      },
    )

    if (!currentSurvey) {
      throw new ServerErrorNotFound('Survey not found')
    }

    // Load survey settings to resolve defaults
    const settingSurvey = await repoSettingSurvey.findOne({}, { context })

    if (!settingSurvey) {
      throw new ServerErrorInternal('Setting survey not found')
    }

    // Verify snapshot exists and belongs to the project
    const snapshot = await repoSurveySnapshotPartial.findOne(
      {
        _id: snapshotId,
        surveyId,
      },
      { context },
    )

    if (!snapshot) {
      throw new ServerErrorNotFound('Survey snapshot not found')
    }

    // Load full survey data for the snapshot
    const snapshotData = await repoSurveySnapshot.findOne(
      { snapshotId },
      { context },
    )

    if (!snapshotData) {
      throw new ServerErrorNotFound('Survey snapshot data not found')
    }

    // Load all languages for both sides in parallel
    const [currentLanguages, snapshotLanguages] = await Promise.all([
      repoSurveyLanguage.find({ surveyId }, { context }),
      repoSurveyLanguageSnapshot.find({ snapshotId }, { context }),
    ])

    // Snapshot side: load from snapshot record (fall back to live for pre-migration snapshots)
    const repoParticipantAttributeSnapshot =
      this.getRepo<RepoSurveyParticipantAttributeSnapshot>(
        'surveyParticipantAttributeSnapshot',
      )
    const repoParticipantAttributeLangSnapshot =
      this.getRepo<RepoSurveyParticipantAttributeLanguageSnapshot>(
        'surveyParticipantAttributeLanguageSnapshot',
      )

    // Current (live) side: always load from live repo
    const repoSurveyParticipantAttribute =
      this.getRepo<RepoSurveyParticipantAttribute>('surveyParticipantAttribute')
    const repoSurveyParticipantAttributeLang =
      this.getRepo<RepoSurveyParticipantAttributeLanguage>(
        'surveyParticipantAttributeLanguage',
      )

    const [
      snapshotAttrDoc,
      liveAttributeDoc,
      snapshotAttrLanguages,
      currentAttrLanguages,
    ] = await Promise.all([
      repoParticipantAttributeSnapshot.findOne({ snapshotId }, { context }),
      repoSurveyParticipantAttribute.findOne({ surveyId }, { context }),
      repoParticipantAttributeLangSnapshot.find({ snapshotId }, { context }),
      repoSurveyParticipantAttributeLang.find({ surveyId }, { context }),
    ])

    const snapshotParticipantAttributes =
      snapshotAttrDoc?.attributes ?? liveAttributeDoc?.attributes ?? []
    const currentParticipantAttributes = liveAttributeDoc?.attributes ?? []

    // Merge all languages into both surveys for a full comparison
    const currentSurveyMerged = currentLanguages.length
      ? mergeSurveyLanguageIntoSurvey(currentSurvey, currentLanguages)
      : currentSurvey
    const snapshotSurveyMerged = snapshotLanguages.length
      ? mergeSurveyLanguageIntoSurvey(snapshotData.survey, snapshotLanguages)
      : snapshotData.survey

    // Normalize both sides with publishPrep before comparing
    const currentSurveyPrepped = currentSurveyMerged.publishPrep(settingSurvey)
    const snapshotSurveyPrepped =
      snapshotSurveyMerged.publishPrep(settingSurvey)

    // Compare the snapshot (A) to the current editing state (B)
    const surveyCompare = new SurveyCompare()
    const comparisonResult = surveyCompare.compare(
      snapshotSurveyPrepped,
      currentSurveyPrepped,
      snapshotParticipantAttributes,
      currentParticipantAttributes,
      snapshotAttrLanguages,
      currentAttrLanguages,
    )

    return {
      snapshot: {
        _id: snapshot._id,
        label: snapshot.label,
        notes: snapshot.notes,
        createdAt: snapshot.createdAt,
      },
      current: {
        _id: currentSurvey._id,
        name: currentSurvey.name,
        updatedAt: currentSurvey.updatedAt,
      },
      comparison: comparisonResult,
    }
  }

  /**
   * Merge responses from source snapshot to target snapshot
   *
   * Delegates to ServiceResponseMerge for orchestration.
   * This method maintains backward compatibility for existing callers.
   *
   * @see ServiceResponseMerge.merge() for implementation details
   */
  async mergeSnapshots({
    surveyId,
    targetSnapshotId,
    sourceSnapshotId,
    targetPublicationId,
    sourcePublicationId,
    projectId,
    aclConditions,
    options = {},
  }: {
    surveyId: string
    targetSnapshotId: string
    sourceSnapshotId: string
    targetPublicationId?: string
    sourcePublicationId?: string
    projectId: string
    aclConditions: AclConditions
    options?: MergeOptions
  }): Promise<MergeResult> {
    const mergeService = this.getService<ServiceResponseMerge>('responseMerge')

    return mergeService.merge({
      surveyId,
      targetSnapshotId,
      sourceSnapshotId,
      targetPublicationId,
      sourcePublicationId,
      projectId,
      aclConditions,
      options,
    })
  }
}

export default ServiceSurveySnapshot
