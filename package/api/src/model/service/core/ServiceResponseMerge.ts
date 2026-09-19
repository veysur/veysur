import {
  Service,
  ServerErrorNotFound,
  ServerErrorBadRequest,
} from 'mzen-server'
import { DataSourceContext } from 'mzen-om'

import {
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  RepoSurveyResponse,
  RepoSurveyPublication,
  RepoSurveyParticipantAttribute,
} from 'model'
import { AclConditions } from 'model/entity/AclContext'

import {
  Survey,
  SurveyResponse,
  SurveyCompare,
  SurveyComparisonResult,
  MergeOptions,
  MergeResult,
  MergeStatistics,
  MergePreview,
} from 'veysur-common'

import { ResponseMapper } from './ServiceSurveySnapshot/ResponseMapper'

export class ServiceResponseMerge extends Service {
  constructor() {
    super({ name: 'responseMerge' })
  }

  /**
   * Merge responses from source snapshot to target snapshot
   *
   * Orchestrates the complete merge workflow:
   * 1. Validates snapshots and checks compatibility
   * 2. Resolves target publication
   * 3. Builds deduplication set
   * 4. Filters duplicate responses
   * 5. Processes responses (mapping + creation)
   * 6. Returns statistics and preview (if dry-run)
   */
  async merge({
    surveyId,
    targetSnapshotId,
    sourceSnapshotId,
    targetPublicationId,
    sourcePublicationId,
    projectId,
    aclConditions: _aclConditions,
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
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })

    // Validate snapshots and get survey data
    const { sourceSurvey, targetSurvey, comparisonResult } =
      await this.validateSnapshots(
        sourceSnapshotId,
        targetSnapshotId,
        surveyId,
        sourcePublicationId,
        context,
      )

    // Resolve target publication ID
    const finalTargetPublicationId = await this.resolveTargetPublication(
      targetSnapshotId,
      targetPublicationId,
      context,
    )

    // Identical snapshots are only mergeable when scoped to a specific source
    // publication (see validateSnapshots) — guard against merging a publication
    // into itself once the target publication is resolved.
    if (
      sourceSnapshotId === targetSnapshotId &&
      sourcePublicationId === finalTargetPublicationId
    ) {
      throw new ServerErrorBadRequest('Cannot merge a publication into itself')
    }

    // Get repositories
    const repoSurveyResponse =
      this.getRepo<RepoSurveyResponse>('surveyResponse')

    // Fetch all responses from source snapshot. When source and target snapshot
    // are identical (unchanged republish), scope to the source publication —
    // otherwise this would also pull in responses already recorded against the
    // target publication.
    const allSourceResponses = await repoSurveyResponse.find(
      {
        snapshotId: sourceSnapshotId,
        surveyId,
        ...(sourceSnapshotId === targetSnapshotId
          ? { publicationId: sourcePublicationId }
          : {}),
      },
      { context },
    )

    // Build deduplication sets and filter responses
    const { targetOriginalIds, targetParticipantIds } =
      await this.buildDeduplicationSet(
        targetSnapshotId,
        sourceSnapshotId === targetSnapshotId
          ? finalTargetPublicationId
          : undefined,
        context,
      )
    const {
      sourceResponses,
      responsesAlreadyMerged,
      responsesSkippedParticipantDuplicate,
    } = this.filterDuplicateResponses(
      allSourceResponses,
      targetOriginalIds,
      targetParticipantIds,
    )

    // Initialize statistics
    const stats: MergeStatistics = {
      sourceResponseCount: allSourceResponses.length,
      responsesCreated: 0,
      responsesAlreadyMerged,
      responsesSkippedParticipantDuplicate,
      answersTransferred: 0,
      answersSkipped: 0,
      answerSkipReasons: {},
    }

    const preview: MergePreview = {
      sampleMappings: [],
    }

    // If dry run, only process first few responses for preview
    const responsesToProcess = options.dryRun
      ? sourceResponses.slice(0, Math.min(5, sourceResponses.length))
      : sourceResponses

    const processAndScale = async (txContext: DataSourceContext = context) => {
      // Process responses
      await this.processResponses(
        responsesToProcess,
        sourceSurvey,
        targetSurvey,
        {
          surveyId,
          targetSnapshotId,
          targetPublicationId: finalTargetPublicationId,
          sourceSnapshotId,
        },
        options,
        repoSurveyResponse,
        txContext,
        stats,
        preview,
      )

      // Scale up statistics for dry-run mode
      if (
        options.dryRun &&
        responsesToProcess.length < sourceResponses.length
      ) {
        this.scaleStatisticsForDryRun(
          stats,
          responsesToProcess.length,
          sourceResponses.length,
        )
      }
    }

    // Start a transaction only for an actual merge - dry-run mode is read-only preview work
    // and has nothing to commit or roll back.
    if (options.dryRun) {
      await processAndScale()
    } else {
      await repoSurveyResponse.transaction(context, processAndScale)
    }

    // Build result
    const result: MergeResult = {
      success: true,
      sourceSnapshotId,
      targetSnapshotId,
      targetPublicationId: finalTargetPublicationId,
      stats,
      compatibility: comparisonResult.compatibility,
    }

    if (options.dryRun) {
      result.preview = preview
    }

    return result
  }

  /**
   * Validate snapshots exist, belong to project, and are compatible
   * Loads full snapshot data and checks structural compatibility
   *
   * @throws ServerErrorNotFound if snapshots not found
   * @throws ServerErrorBadRequest if trying to merge snapshot into itself
   */
  private async validateSnapshots(
    sourceSnapshotId: string,
    targetSnapshotId: string,
    surveyId: string,
    sourcePublicationId: string | undefined,
    context: DataSourceContext,
  ): Promise<{
    sourceSurvey: Survey
    targetSurvey: Survey
    comparisonResult: SurveyComparisonResult
  }> {
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const repoSurveySnapshot =
      this.getRepo<RepoSurveySnapshot>('surveySnapshot')

    // Validate both snapshots exist and belong to the same survey
    const sourceSnapshot = await repoSurveySnapshotPartial.findOne(
      {
        _id: sourceSnapshotId,
        surveyId,
      },
      { context },
    )

    if (!sourceSnapshot) {
      throw new ServerErrorNotFound('Source survey snapshot not found')
    }

    const targetSnapshot = await repoSurveySnapshotPartial.findOne(
      {
        _id: targetSnapshotId,
        surveyId,
      },
      { context },
    )

    if (!targetSnapshot) {
      throw new ServerErrorNotFound('Target survey snapshot not found')
    }

    // Prevent merging a snapshot into itself, unless scoped to a specific
    // source publication — an unchanged republish reuses the same snapshot
    // for a new publication, so "merge from the previous publication" is a
    // valid copy operation even when source and target snapshot are identical.
    // Without a source publication to scope by, there is no way to tell which
    // responses to copy, so this remains a hard error.
    if (sourceSnapshotId === targetSnapshotId && !sourcePublicationId) {
      throw new ServerErrorBadRequest('Cannot merge a snapshot into itself')
    }

    // Load full survey data for both snapshots
    const sourceSnapshotData = await repoSurveySnapshot.findOne(
      {
        snapshotId: sourceSnapshotId,
      },
      { context },
    )

    if (!sourceSnapshotData) {
      throw new ServerErrorNotFound('Source survey snapshot data not found')
    }

    const targetSnapshotData = await repoSurveySnapshot.findOne(
      {
        snapshotId: targetSnapshotId,
      },
      { context },
    )

    if (!targetSnapshotData) {
      throw new ServerErrorNotFound('Target survey snapshot data not found')
    }

    // Ensure surveys are properly instantiated as Survey objects with collection methods
    const sourceSurvey = new Survey(sourceSnapshotData.survey)
    const targetSurvey = new Survey(targetSnapshotData.survey)

    // Load participant attributes (not versioned — both snapshots share the same surveyId)
    const repoSurveyParticipantAttribute =
      this.getRepo<RepoSurveyParticipantAttribute>('surveyParticipantAttribute')
    const participantAttributeDoc =
      await repoSurveyParticipantAttribute.findOne({ surveyId }, { context })
    const participantAttributes = participantAttributeDoc?.attributes ?? []

    // Check compatibility between snapshots
    const surveyCompare = new SurveyCompare()
    const comparisonResult = surveyCompare.compare(
      sourceSurvey,
      targetSurvey,
      participantAttributes,
      participantAttributes,
    )

    // Note: We allow merging even if incompatible (permissive merge)
    // The compatibility check serves as a warning, but merge will proceed
    // and skip any answers that cannot be mapped structurally

    return {
      sourceSurvey,
      targetSurvey,
      comparisonResult,
    }
  }

  /**
   * Determine target publication ID with priority:
   * 1. Explicit publication ID (if provided and valid)
   * 2. Active publication (stopped = null)
   * 3. Most recent stopped publication (by published date)
   *
   * @returns Publication ID for merged responses
   * @throws ServerErrorNotFound if publication not found
   * @throws ServerErrorBadRequest if publication doesn't match snapshot or no publication exists
   */
  private async resolveTargetPublication(
    targetSnapshotId: string,
    targetPublicationId: string | undefined,
    context: DataSourceContext,
  ): Promise<string> {
    const repoSurveyPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')

    if (targetPublicationId) {
      // If explicit publication ID provided, validate it exists and matches snapshot
      const publication = await repoSurveyPublication.findOne(
        {
          _id: targetPublicationId,
        },
        { context },
      )

      if (!publication) {
        throw new ServerErrorNotFound('Target publication not found')
      }

      if (publication.snapshotId !== targetSnapshotId) {
        throw new ServerErrorBadRequest(
          'Target publication does not match target snapshot',
        )
      }

      return targetPublicationId
    } else {
      // Look up publication for target snapshot
      // Priority: 1) Active publication, 2) Most recent stopped publication
      let targetPublication = await repoSurveyPublication.findOne(
        {
          snapshotId: targetSnapshotId,
          stoppedAt: null, // Try active first
        },
        { context },
      )

      // If no active publication, find most recent publication (including stopped)
      if (!targetPublication) {
        targetPublication = await repoSurveyPublication.findOne(
          { snapshotId: targetSnapshotId },
          { context, sort: { publishedAt: -1 } }, // Most recent by published date
        )
      }

      // Require publication to exist
      if (!targetPublication) {
        throw new ServerErrorBadRequest(
          'Target snapshot must have an associated publication to merge responses.',
        )
      }

      return targetPublication._id
    }
  }

  /**
   * Build sets used to detect duplicate responses already present in target:
   * - targetOriginalIds: native response IDs (response._id) plus original response
   *   IDs from merged responses (response.merge.origResponseId) — enables
   *   deduplication across merge chains (A → B → A prevented)
   * - targetParticipantIds: participantId of every non-anonymous response already
   *   in target — enables deduplication when the same participant has an
   *   independent (never-merged) response in both snapshots
   *
   * @returns Sets of response IDs and participant IDs to exclude from merge
   */
  private async buildDeduplicationSet(
    targetSnapshotId: string,
    scopeToTargetPublicationId: string | undefined,
    context: DataSourceContext,
  ): Promise<{
    targetOriginalIds: Set<string>
    targetParticipantIds: Set<string>
  }> {
    const repoSurveyResponse =
      this.getRepo<RepoSurveyResponse>('surveyResponse')

    // Build set of all "original response IDs" already represented in target.
    // When source and target snapshot are identical (unchanged republish),
    // scope to the target publication — otherwise this query would also match
    // every response being copied from the source publication, since they
    // share the same snapshotId, and the merge would wrongly treat all of
    // them as already-merged duplicates.
    const targetResponses = await repoSurveyResponse.find(
      {
        snapshotId: targetSnapshotId,
        ...(scopeToTargetPublicationId
          ? { publicationId: scopeToTargetPublicationId }
          : {}),
      },
      { context },
    )

    const targetOriginalIds = new Set<string>()
    const targetParticipantIds = new Set<string>()

    for (const response of targetResponses) {
      // Add native response IDs
      targetOriginalIds.add(response._id)

      // Add original response IDs from merged responses
      if (response.merge?.origResponseId) {
        targetOriginalIds.add(response.merge.origResponseId)
      }

      if (response.participantId) {
        targetParticipantIds.add(response.participantId)
      }
    }

    return { targetOriginalIds, targetParticipantIds }
  }

  /**
   * Filter source responses to exclude duplicates
   *
   * A response is skipped if either:
   * - Its "original ID" (merge.origResponseId, or response._id for native
   *   responses) already exists in target — prevents re-merging the same
   *   response (A → B → B, A → B → A)
   * - Its participantId already has a response in target — prevents the same
   *   participant ending up with two responses in one snapshot, even when
   *   there is no merge lineage connecting the two responses. Applied in
   *   source order so only the first response for a given not-yet-present
   *   participant is kept.
   *
   * @returns Filtered responses and counts of skipped responses per reason
   */
  private filterDuplicateResponses(
    allSourceResponses: SurveyResponse[],
    deduplicationSet: Set<string>,
    targetParticipantIds: Set<string>,
  ): {
    sourceResponses: SurveyResponse[]
    responsesAlreadyMerged: number
    responsesSkippedParticipantDuplicate: number
  } {
    const seenParticipantIds = new Set(targetParticipantIds)
    let responsesAlreadyMerged = 0
    let responsesSkippedParticipantDuplicate = 0

    const sourceResponses = allSourceResponses.filter((sourceResp) => {
      // Get the "original ID" for this source response
      const sourceOrigId = sourceResp.merge?.origResponseId ?? sourceResp._id

      // Skip if this original response is already represented in target
      if (deduplicationSet.has(sourceOrigId)) {
        responsesAlreadyMerged++
        return false
      }

      // Skip if this participant already has a response in target (or earlier
      // in this same source batch)
      if (
        sourceResp.participantId &&
        seenParticipantIds.has(sourceResp.participantId)
      ) {
        responsesSkippedParticipantDuplicate++
        return false
      }

      if (sourceResp.participantId) {
        seenParticipantIds.add(sourceResp.participantId)
      }

      return true
    })

    return {
      sourceResponses,
      responsesAlreadyMerged,
      responsesSkippedParticipantDuplicate,
    }
  }

  /**
   * Process responses: map answers and create new responses
   *
   * For each response:
   * 1. Map answers using ResponseMapper
   * 2. Track statistics (transferred, skipped, reasons)
   * 3. Create new response in target (if not dry-run and has answers)
   * 4. Build preview sample (if dry-run)
   */
  private async processResponses(
    responsesToProcess: SurveyResponse[],
    sourceSurvey: Survey,
    targetSurvey: Survey,
    config: {
      surveyId: string
      targetSnapshotId: string
      targetPublicationId: string
      sourceSnapshotId: string
    },
    options: MergeOptions,
    repoSurveyResponse: RepoSurveyResponse,
    context: DataSourceContext,
    stats: MergeStatistics,
    preview: MergePreview,
  ): Promise<void> {
    // Process each response
    for (const sourceResponse of responsesToProcess) {
      // Map the response
      const mapping = ResponseMapper.mapResponse(
        sourceResponse,
        sourceSurvey,
        targetSurvey,
      )

      // Track statistics
      const mappedAnswerCount = Object.keys(mapping.mappedAnswers).length
      stats.answersTransferred += mappedAnswerCount
      stats.answersSkipped += mapping.skippedAnswers.length

      // Track skip reasons
      for (const skip of mapping.skippedAnswers) {
        stats.answerSkipReasons[skip.reason] =
          (stats.answerSkipReasons[skip.reason] || 0) + 1
      }

      // Count responses that will be created (only if there's at least one answer)
      if (mappedAnswerCount > 0) {
        stats.responsesCreated++
      }

      // If dry run, add to preview
      if (options.dryRun) {
        preview.sampleMappings.push(mapping)
      } else {
        // Create new response in target snapshot only if there's at least one answer
        if (mappedAnswerCount > 0) {
          const allAnswersMapped = mapping.skippedAnswers.length === 0

          const newResponse = new SurveyResponse({
            surveyId: config.surveyId,
            snapshotId: config.targetSnapshotId,
            publicationId: config.targetPublicationId,
            participantId: sourceResponse.participantId,
            sessionId: sourceResponse.sessionId,
            answers: mapping.mappedAnswers,
            completed: allAnswersMapped ? sourceResponse.completed : false, // Keep completion status only if all answers mapped
            completedAt: allAnswersMapped ? sourceResponse.completedAt : null,
            merge: {
              fromSnapshotId: config.sourceSnapshotId,
              origResponseId:
                sourceResponse.merge?.origResponseId ?? sourceResponse._id,
              at: new Date(),
            },
          })

          await repoSurveyResponse.insertOne(newResponse, { context })
        }
      }
    }
  }

  /**
   * Scale statistics for dry-run preview
   * When sampling first N responses, extrapolate to full dataset
   *
   * Scales:
   * - responsesCreated
   * - answersTransferred
   * - answersSkipped
   * - answerSkipReasons (each reason count)
   *
   * @param stats - Statistics object to modify in-place
   * @param sampleSize - Number of responses sampled
   * @param totalSize - Total number of responses
   */
  private scaleStatisticsForDryRun(
    stats: MergeStatistics,
    sampleSize: number,
    totalSize: number,
  ): void {
    const scaleFactor = totalSize / sampleSize
    stats.responsesCreated = Math.round(stats.responsesCreated * scaleFactor)
    stats.answersTransferred = Math.round(
      stats.answersTransferred * scaleFactor,
    )
    stats.answersSkipped = Math.round(stats.answersSkipped * scaleFactor)

    // Scale skip reasons
    for (const reason in stats.answerSkipReasons) {
      stats.answerSkipReasons[reason] = Math.round(
        stats.answerSkipReasons[reason] * scaleFactor,
      )
    }
  }
}

export default ServiceResponseMerge
