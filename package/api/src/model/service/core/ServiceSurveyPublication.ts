import {
  Service,
  ServerErrorNotFound,
  ServerErrorInternal,
  ServerErrorBadRequest,
} from '@datacapy/server'
import { DataSourceContext } from '@datacapy/om'

import { parsePaginationParams, contextForProject } from 'common'
import {
  Survey,
  SurveyValidation,
  mergeSurveyLanguageIntoSurvey,
  SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_NAMES,
} from 'veysur-common'
import {
  generateSurveyStructuralHash,
  generateSurveyLanguageHash,
  generateSnapshotContentHash,
  generateParticipantAttributeStructureHash,
  generateParticipantAttributeLanguageHash,
} from 'veysur-common/util/generateSurveyHash'

import {
  RepoSurvey,
  RepoSettingSurvey,
  RepoSurveyLanguage,
  RepoSurveyLanguageSnapshot,
  RepoSurveyParticipantAttribute,
  RepoSurveyParticipantAttributeLanguage,
  RepoSurveyParticipantAttributeSnapshot,
  RepoSurveyParticipantAttributeLanguageSnapshot,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  RepoSurveyPublication,
  RepoSurveyResponse,
} from '../../repo'
import {
  SurveyLanguageSnapshot,
  SurveyPublication,
  SurveySnapshotPartial,
  SurveySnapshot,
  SurveyParticipantAttributeSnapshot,
  SurveyParticipantAttributeLanguageSnapshot,
} from '../../constructor'
import ServiceSurveySnapshot from './ServiceSurveySnapshot'

export class ServicePublication extends Service {
  constructor() {
    super({
      name: 'surveyPublication',
    })
  }

  /**
   * Generate the composite content hash (plus its constituent per-language and
   * per-attribute hashes) for a survey's current structure. Shared by publish() and
   * hasUnpublishedChanges() so both paths stay byte-for-byte consistent with what gets
   * stored on a snapshot.
   */
  private computeContentHash(
    survey: Survey,
    settingSurvey,
    allLanguages,
    surveyParticipantAttributeDoc,
    attributeLanguageDocs,
  ): {
    contentHash: string
    langHashes: string[]
    attributeStructureHash?: string
    sortedAttributeLangHashes?: string[]
  } {
    const structuralHash = generateSurveyStructuralHash(survey, settingSurvey)
    const sortedLanguages = [...allLanguages].sort((a, b) =>
      a.languageCode.localeCompare(b.languageCode),
    )
    const langHashes = sortedLanguages.map((l) => generateSurveyLanguageHash(l))

    let attributeStructureHash: string | undefined
    let sortedAttributeLangHashes: string[] | undefined

    if (surveyParticipantAttributeDoc) {
      attributeStructureHash = generateParticipantAttributeStructureHash(
        surveyParticipantAttributeDoc.attributes,
      )
      const sortedAttrLangs = [...attributeLanguageDocs].sort((a, b) =>
        a.languageCode.localeCompare(b.languageCode),
      )
      sortedAttributeLangHashes = sortedAttrLangs.map((l) =>
        generateParticipantAttributeLanguageHash(l.data),
      )
    }

    const contentHash = generateSnapshotContentHash(
      structuralHash,
      langHashes,
      attributeStructureHash,
      sortedAttributeLangHashes,
    )

    return {
      contentHash,
      langHashes,
      attributeStructureHash,
      sortedAttributeLangHashes,
    }
  }

  /**
   * Create a new snapshot (survey structure, per-language, and per-participant-attribute
   * rows) for the "not reused" branch of publish(). Always runs inside publish()'s
   * transaction; the caller is responsible for setting wasReused = false.
   */
  private async createSnapshot(
    surveyId: string,
    survey: Survey,
    settingSurvey,
    sortedLanguages,
    langHashes: string[],
    contentHash: string,
    surveyParticipantAttributeDoc,
    sortedAttrLangs,
    sortedAttributeLangHashes: string[] | undefined,
    attributeStructureHash: string | undefined,
    snapshotLabel: string | null,
    snapshotNotes: string | null,
    createdById: string,
    context: DataSourceContext,
  ): Promise<{
    snapshot: SurveySnapshotPartial
    snapshotData: SurveySnapshot
  }> {
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const repoSurveySnapshot =
      this.getRepo<RepoSurveySnapshot>('surveySnapshot')
    const repoSurveyLanguageSnapshot = this.getRepo<RepoSurveyLanguageSnapshot>(
      'surveyLanguageSnapshot',
    )
    const repoSurveyParticipantAttributeSnapshot =
      this.getRepo<RepoSurveyParticipantAttributeSnapshot>(
        'surveyParticipantAttributeSnapshot',
      )
    const repoSurveyParticipantAttributeLanguageSnapshot =
      this.getRepo<RepoSurveyParticipantAttributeLanguageSnapshot>(
        'surveyParticipantAttributeLanguageSnapshot',
      )

    const surveyPartial = survey.getPublishPartial(settingSurvey)
    const snapshot = new SurveySnapshotPartial({
      surveyId,
      createdById,
      contentHash,
      label: snapshotLabel || null,
      notes: snapshotNotes || null,
      surveyPartial,
    })

    // Store structural survey only — no L10n; languages are in SurveyLanguageSnapshot.
    // publishPrep resolves null settings to project defaults so the snapshot is
    // self-contained and unaffected by later changes to project settings.
    const snapshotData = new SurveySnapshot({
      snapshotId: snapshot._id,
      survey: survey.publishPrep(settingSurvey),
    })

    await repoSurveySnapshotPartial.insertOne(snapshot, { context })
    await repoSurveySnapshot.insertOne(snapshotData, { context })

    // Insert one SurveyLanguageSnapshot per language
    for (let i = 0; i < sortedLanguages.length; i++) {
      const lang = sortedLanguages[i]
      const languageSnapshot = new SurveyLanguageSnapshot({
        snapshotId: snapshot._id,
        surveyId,
        languageCode: lang.languageCode,
        contentHash: langHashes[i],
        data: lang.data,
      })
      await repoSurveyLanguageSnapshot.insertOne(languageSnapshot, {
        context,
      })
    }
    // Insert participant attribute snapshots if attributes exist
    if (surveyParticipantAttributeDoc) {
      const attrSnapshot = new SurveyParticipantAttributeSnapshot({
        snapshotId: snapshot._id,
        surveyId,
        attributes: surveyParticipantAttributeDoc.attributes,
        contentHash: attributeStructureHash,
      })
      await repoSurveyParticipantAttributeSnapshot.insertOne(attrSnapshot, {
        context,
      })

      for (let i = 0; i < sortedAttrLangs.length; i++) {
        const attrLang = sortedAttrLangs[i]
        const attrLangSnapshot = new SurveyParticipantAttributeLanguageSnapshot(
          {
            snapshotId: snapshot._id,
            surveyId,
            languageCode: attrLang.languageCode,
            data: attrLang.data,
            contentHash: sortedAttributeLangHashes[i],
          },
        )
        await repoSurveyParticipantAttributeLanguageSnapshot.insertOne(
          attrLangSnapshot,
          { context },
        )
      }
    }

    return { snapshot, snapshotData }
  }

  /**
   * Stop any currently active publication for the survey and create a new one pointing
   * at the given snapshot. Shared by publish() and republish() — both end with the same
   * unpublish-then-insert step, differing only in how they arrive at the snapshot ID.
   */
  private async replacePublication(
    surveyId: string,
    snapshotId: string,
    label: string | null,
    notes: string | null,
    publishedById: string,
    context: DataSourceContext,
  ): Promise<SurveyPublication> {
    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')

    await repoPublication.updateMany(
      {
        surveyId,
        stoppedAt: null,
      },
      {
        $set: {
          stoppedAt: new Date(),
        },
      },
      { context },
    )

    const publication = new SurveyPublication({
      snapshotId,
      surveyId,
      publishedById,
      label,
      notes,
      publishedAt: new Date(),
      stoppedAt: null,
    })

    await repoPublication.insertOne(publication, { context })

    return publication
  }

  /**
   * Publish a survey - creates new snapshot and publication (or reuses existing snapshot)
   */
  async publish({
    surveyId,
    projectId,
    label,
    notes,
    snapshotLabel,
    snapshotNotes,
    forceNewSnapshot = false,
    aclConditions: _aclConditions,
    aclContext,
  }) {
    const context = contextForProject(projectId)

    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')
    const repoSurveyLanguage =
      this.getRepo<RepoSurveyLanguage>('surveyLanguage')
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )

    let publication: SurveyPublication
    let snapshot: SurveySnapshotPartial
    let snapshotData: SurveySnapshot
    let wasReused = false
    let contentHash: string

    await repoSurveySnapshotPartial.transaction(context, async (context) => {
      let survey = await repoSurvey.findOne(
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
      if (!survey) {
        throw new ServerErrorNotFound('Survey not found')
      }
      // Populated questions/groups come back in unsorted DB row order -
      // realise the actual editor-configured order (survey.elementIds)
      // before validation, or position-dependent checks (e.g. forward-
      // reference conditions) compare against the wrong order.
      survey = survey.applySortOrder()

      const settingSurvey = await repoSettingSurvey.findOne({}, { context })
      if (!settingSurvey) {
        throw new ServerErrorInternal('Setting survey not found')
      }

      // 1. LOAD ALL SURVEY LANGUAGES
      const allLanguageCodes = survey.language?.options ?? []
      const allLanguages = allLanguageCodes.length
        ? await repoSurveyLanguage.find(
            { surveyId, languageCode: { $in: allLanguageCodes } },
            { context },
          )
        : []

      // 1b. LOAD PARTICIPANT ATTRIBUTES
      const repoSurveyParticipantAttribute =
        this.getRepo<RepoSurveyParticipantAttribute>(
          'surveyParticipantAttribute',
        )
      const repoSurveyParticipantAttributeLanguage =
        this.getRepo<RepoSurveyParticipantAttributeLanguage>(
          'surveyParticipantAttributeLanguage',
        )

      const [surveyParticipantAttributeDoc, attributeLanguageDocs] =
        await Promise.all([
          repoSurveyParticipantAttribute.findOne({ surveyId }, { context }),
          repoSurveyParticipantAttributeLanguage.find(
            { surveyId },
            { context },
          ),
        ])

      // 2. MERGE LANGUAGES FOR VALIDATION
      const surveyMerged = allLanguages.length
        ? mergeSurveyLanguageIntoSurvey(survey, allLanguages)
        : survey

      const surveyPublish = surveyMerged.publishPrep(settingSurvey)
      const participantVariableNames = new Set<string>([
        ...SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_NAMES,
        ...(surveyParticipantAttributeDoc?.attributes.map((a) => a.name) ?? []),
      ])
      const validator = new SurveyValidation()
      const validationResult = await validator.validate(
        surveyPublish,
        settingSurvey,
        participantVariableNames,
      )
      if (!validationResult.isValid) {
        throw new ServerErrorBadRequest({
          message: 'Survey validation failed',
          errors: validationResult.errors,
        })
      }

      // 3. GENERATE COMPOSITE CONTENT HASH
      const sortedLanguages = [...allLanguages].sort((a, b) =>
        a.languageCode.localeCompare(b.languageCode),
      )
      const sortedAttrLangs = [...attributeLanguageDocs].sort((a, b) =>
        a.languageCode.localeCompare(b.languageCode),
      )
      const {
        contentHash: computedContentHash,
        langHashes,
        attributeStructureHash,
        sortedAttributeLangHashes,
      } = this.computeContentHash(
        survey,
        settingSurvey,
        allLanguages,
        surveyParticipantAttributeDoc,
        attributeLanguageDocs,
      )
      contentHash = computedContentHash

      // 4. LOOKUP EXISTING SNAPSHOT BY HASH (unless forced)
      if (!forceNewSnapshot) {
        const serviceSurveySnapshot =
          this.getService<ServiceSurveySnapshot>('surveySnapshot')
        const existing = await serviceSurveySnapshot.findByContentHash(
          surveyId,
          contentHash,
          projectId,
        )

        if (existing) {
          // REUSE EXISTING SNAPSHOT
          snapshot = existing.snapshot
          snapshotData = existing.snapshotData
          wasReused = true
        }
      }

      // 5. CREATE NEW SNAPSHOT if not found or forced
      if (!snapshot) {
        const created = await this.createSnapshot(
          surveyId,
          survey,
          settingSurvey,
          sortedLanguages,
          langHashes,
          contentHash,
          surveyParticipantAttributeDoc,
          sortedAttrLangs,
          sortedAttributeLangHashes,
          attributeStructureHash,
          snapshotLabel,
          snapshotNotes,
          aclContext.jwt._id,
          context,
        )
        snapshot = created.snapshot
        snapshotData = created.snapshotData
        wasReused = false
      }

      // 6. REPLACE ACTIVE PUBLICATION
      publication = await this.replacePublication(
        surveyId,
        snapshot._id,
        label || null,
        notes || null,
        aclContext.jwt._id,
        context,
      )
    })

    await this.modelManager.services.eventLog.log({
      projectId,
      action: 'survey.published',
      userId: aclContext.jwt._id,
      metadata: {
        surveyId,
        publicationId: publication._id,
        snapshotId: snapshot._id,
      },
    })

    await this.modelManager.services.surveyEmbedArtefact.refresh({
      surveyId,
      projectId,
    })

    return { publication, snapshot, snapshotData, wasReused, contentHash }
  }

  /**
   * Republish an existing snapshot - creates new publication only
   */
  async republish({
    surveyId,
    snapshotId,
    projectId,
    label,
    notes,
    aclConditions: _aclConditions,
    aclContext,
  }) {
    const context = contextForProject(projectId)

    const repoSurveySnapshot = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )

    let publication: SurveyPublication
    let snapshot: SurveySnapshotPartial

    await repoSurveySnapshot.transaction(context, async (context) => {
      // Verify snapshot exists
      snapshot = await repoSurveySnapshot.findOne(
        {
          _id: snapshotId,
          surveyId,
        },
        { context },
      )

      if (!snapshot) {
        throw new ServerErrorNotFound('Snapshot not found')
      }

      publication = await this.replacePublication(
        surveyId,
        snapshotId,
        label || null,
        notes || null,
        aclContext.jwt._id,
        context,
      )
    })

    await this.modelManager.services.eventLog.log({
      projectId,
      action: 'survey.republished',
      userId: aclContext.jwt._id,
      metadata: { surveyId, snapshotId, publicationId: publication._id },
    })

    await this.modelManager.services.surveyEmbedArtefact.refresh({
      surveyId,
      projectId,
    })

    return { publication, snapshot }
  }

  /**
   * Unpublish - stops active publication
   */
  async unpublish({ surveyId, projectId }) {
    const context = contextForProject(projectId)
    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')

    await repoPublication.updateOne(
      {
        surveyId,
        stoppedAt: null,
      },
      {
        $set: {
          stoppedAt: new Date(),
        },
      },
      { context },
    )

    await this.modelManager.services.eventLog.log({
      projectId,
      action: 'survey.unpublished',
      metadata: { surveyId },
    })

    await this.modelManager.services.surveyEmbedArtefact.refresh({
      surveyId,
      projectId,
    })
  }

  /**
   * Get published event with snapshot data
   */
  async getPublished({ surveyId, projectId, withData = true }) {
    const context = contextForProject(projectId)
    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const repoSurveySnapshot =
      this.getRepo<RepoSurveySnapshot>('surveySnapshot')

    const publication = await repoPublication.findOne(
      {
        surveyId,
        stoppedAt: null,
      },
      {
        context,
        sort: { createdAt: -1 },
      },
    )

    if (!publication) {
      return { publication: null, snapshot: null, snapshotData: null }
    }

    const snapshot = await repoSurveySnapshotPartial.findOne(
      {
        _id: publication.snapshotId,
      },
      { context },
    )

    const snapshotData =
      withData && snapshot
        ? await repoSurveySnapshot.findOne(
            {
              snapshotId: snapshot._id,
            },
            { context },
          )
        : null

    return { publication, snapshot, snapshotData }
  }

  /**
   * Cheap content-based check for whether the live survey differs from the currently
   * active publication's snapshot. Reuses the same hashing computeContentHash() does for
   * publish(), so it stays consistent with what a real publish would produce — unlike a
   * survey.updatedAt-vs-publication.publishedAt timestamp comparison, this correctly
   * reports "no changes" when edits are made and then reverted (e.g. moving a question
   * away and back to its original position).
   */
  async hasUnpublishedChanges({ surveyId, projectId }) {
    const context = contextForProject(projectId)
    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )

    const publication = await repoPublication.findOne(
      {
        surveyId,
        stoppedAt: null,
      },
      {
        context,
        sort: { createdAt: -1 },
      },
    )

    if (!publication) {
      return { hasChanges: false }
    }

    const snapshot = await repoSurveySnapshotPartial.findOne(
      {
        _id: publication.snapshotId,
      },
      { context },
    )

    if (!snapshot) {
      return { hasChanges: false }
    }

    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')
    const repoSurveyLanguage =
      this.getRepo<RepoSurveyLanguage>('surveyLanguage')
    const repoSurveyParticipantAttribute =
      this.getRepo<RepoSurveyParticipantAttribute>('surveyParticipantAttribute')
    const repoSurveyParticipantAttributeLanguage =
      this.getRepo<RepoSurveyParticipantAttributeLanguage>(
        'surveyParticipantAttributeLanguage',
      )

    let survey = await repoSurvey.findOne(
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
    if (!survey) {
      throw new ServerErrorNotFound('Survey not found')
    }
    // Keep in step with publish() - unsorted populate order would otherwise
    // produce a structural hash that never matches the snapshot's.
    survey = survey.applySortOrder()

    const settingSurvey = await repoSettingSurvey.findOne({}, { context })
    if (!settingSurvey) {
      throw new ServerErrorInternal('Setting survey not found')
    }

    const allLanguageCodes = survey.language?.options ?? []
    const [allLanguages, surveyParticipantAttributeDoc, attributeLanguageDocs] =
      await Promise.all([
        allLanguageCodes.length
          ? repoSurveyLanguage.find(
              { surveyId, languageCode: { $in: allLanguageCodes } },
              { context },
            )
          : Promise.resolve([]),
        repoSurveyParticipantAttribute.findOne({ surveyId }, { context }),
        repoSurveyParticipantAttributeLanguage.find({ surveyId }, { context }),
      ])

    const { contentHash } = this.computeContentHash(
      survey,
      settingSurvey,
      allLanguages,
      surveyParticipantAttributeDoc,
      attributeLanguageDocs,
    )

    return { hasChanges: contentHash !== snapshot.contentHash }
  }

  /**
   * Get publication list for a survey
   */
  async getList({ surveyId, projectId, page, perPage }) {
    const context = contextForProject(projectId)
    const pagination = parsePaginationParams(page, perPage, { perPage: 10 })
    page = pagination.page
    perPage = pagination.perPage

    const offset = (page - 1) * perPage

    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')

    const query = { surveyId }

    const publicationCount = await repoPublication.count(query, { context })

    const publications = await repoPublication.find(query, {
      context,
      limit: perPage,
      sort: { createdAt: -1 },
      offset,
      populate: {
        responseCount: true,
      },
    })

    return { publications, publicationCount }
  }

  /**
   * Get a single publication by ID
   */
  async get({ surveyId, publicationId, projectId }) {
    const context = contextForProject(projectId)

    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')

    const publication = await repoPublication.findOne(
      {
        _id: publicationId,
        surveyId,
      },
      { context },
    )

    if (!publication) {
      throw new ServerErrorNotFound('Publication not found')
    }

    return { publication }
  }

  /**
   * Update publication label and notes
   */
  async update({ surveyId, publicationId, projectId, label, notes }) {
    const context = contextForProject(projectId)

    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')

    const publication = await repoPublication.findOne(
      {
        _id: publicationId,
        surveyId,
      },
      { context },
    )

    if (!publication) {
      throw new ServerErrorNotFound('Publication not found')
    }

    await repoPublication.updateOne(
      { _id: publicationId },
      {
        $set: {
          label: label !== undefined ? label : publication.label,
          notes: notes !== undefined ? notes : publication.notes,
          updatedAt: new Date(),
        },
      },
      { context },
    )

    const updatedPublication = await repoPublication.findOne(
      {
        _id: publicationId,
      },
      { context },
    )

    return { publication: updatedPublication }
  }

  async deleteMany({
    surveyId,
    publicationIds,
    projectId,
    aclConditions: _aclConditions,
  }) {
    const context = contextForProject(projectId)
    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')
    const repoSurveyResponse =
      this.getRepo<RepoSurveyResponse>('surveyResponse')
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const repoSurveySnapshot =
      this.getRepo<RepoSurveySnapshot>('surveySnapshot')
    const repoSurveyLanguageSnapshot = this.getRepo<RepoSurveyLanguageSnapshot>(
      'surveyLanguageSnapshot',
    )

    let activePublication: SurveyPublication | null = null
    const orphanedSnapshotIds: string[] = []

    await repoPublication.transaction(context, async (context) => {
      // Verify all publications exist and belong to the project
      const publications = await repoPublication.find(
        {
          _id: { $in: publicationIds },
          surveyId,
        },
        { context },
      )

      if (publications.length !== publicationIds.length) {
        throw new ServerErrorNotFound('One or more publications not found')
      }

      // Deleting the currently active publication implicitly unpublishes the
      // survey - the row is removed either way, so no separate `stopped`
      // write is needed here, but the audit trail should still record it.
      activePublication = publications.find((p) => p.stoppedAt === null) ?? null

      // Collect affected snapshot IDs (for orphan check later)
      const affectedSnapshotIds = [
        ...new Set(publications.map((p) => p.snapshotId)),
      ]

      // Delete responses associated with these publications
      await repoSurveyResponse.deleteMany(
        {
          publicationId: { $in: publicationIds },
          surveyId,
        },
        { context },
      )

      // Delete the publications
      await repoPublication.deleteMany(
        {
          _id: { $in: publicationIds },
          surveyId,
        },
        { context },
      )

      // Check for orphaned snapshots and delete them
      const repoSurveyParticipantAttributeSnapshotForDelete =
        this.getRepo<RepoSurveyParticipantAttributeSnapshot>(
          'surveyParticipantAttributeSnapshot',
        )
      const repoSurveyParticipantAttributeLanguageSnapshotForDelete =
        this.getRepo<RepoSurveyParticipantAttributeLanguageSnapshot>(
          'surveyParticipantAttributeLanguageSnapshot',
        )

      for (const snapshotId of affectedSnapshotIds) {
        // Check if any publications still reference this snapshot
        const remainingPublications = await repoPublication.count(
          {
            snapshotId,
          },
          { context },
        )

        if (remainingPublications === 0) {
          orphanedSnapshotIds.push(snapshotId)
          // Snapshot is orphaned - delete it and its data
          await repoSurveySnapshot.deleteMany({ snapshotId }, { context })
          await repoSurveyLanguageSnapshot.deleteMany(
            { snapshotId },
            { context },
          )
          await repoSurveyParticipantAttributeSnapshotForDelete.deleteMany(
            { snapshotId },
            { context },
          )
          await repoSurveyParticipantAttributeLanguageSnapshotForDelete.deleteMany(
            { snapshotId },
            { context },
          )
          await repoSurveySnapshotPartial.deleteMany(
            { _id: snapshotId },
            { context },
          )
        }
      }
    })

    // Deleting the active publication implicitly unpublishes the survey -
    // log it after the transaction commits so a rollback never produces a
    // spurious unpublish event.
    if (activePublication) {
      await this.modelManager.services.eventLog.log({
        projectId,
        action: 'survey.unpublished',
        metadata: { surveyId },
      })
    }

    const embedArtefact = this.modelManager.services.surveyEmbedArtefact
    if (orphanedSnapshotIds.length > 0) {
      await embedArtefact.removeSnapshots({
        surveyId,
        projectId,
        snapshotIds: orphanedSnapshotIds,
      })
    } else if (activePublication) {
      await embedArtefact.refresh({ surveyId, projectId })
    }
  }

  /**
   * Merge responses from source publication to target publication
   */
  async mergePublications({
    surveyId,
    targetPublicationId,
    sourcePublicationId,
    projectId,
    aclConditions,
    options = {},
  }) {
    const context = contextForProject(projectId)
    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')

    // Fetch both publications
    const targetPublication = await repoPublication.findOne(
      {
        _id: targetPublicationId,
        surveyId,
      },
      { context },
    )

    if (!targetPublication) {
      throw new ServerErrorNotFound('Target publication not found')
    }

    const sourcePublication = await repoPublication.findOne(
      {
        _id: sourcePublicationId,
        surveyId,
      },
      { context },
    )

    if (!sourcePublication) {
      throw new ServerErrorNotFound('Source publication not found')
    }

    // Validate they belong to the same survey (should be guaranteed by query, but double-check)
    if (targetPublication.surveyId !== sourcePublication.surveyId) {
      throw new ServerErrorBadRequest(
        'Publications must belong to the same survey',
      )
    }

    // Prevent merging publication into itself
    if (targetPublicationId === sourcePublicationId) {
      throw new ServerErrorBadRequest('Cannot merge a publication into itself')
    }

    // Get snapshot service and delegate to snapshot merge with explicit target publication ID
    const snapshotService =
      this.getService<ServiceSurveySnapshot>('surveySnapshot')

    return await snapshotService.mergeSnapshots({
      surveyId,
      targetSnapshotId: targetPublication.snapshotId,
      sourceSnapshotId: sourcePublication.snapshotId,
      targetPublicationId, // Explicit publication ID
      sourcePublicationId,
      projectId,
      aclConditions,
      options,
    })
  }
}

export default ServicePublication
