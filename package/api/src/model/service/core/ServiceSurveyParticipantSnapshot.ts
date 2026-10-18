import { Service, ServerErrorNotFound } from '@datacapy/server'
import { DataSourceContext } from '@datacapy/om'
import { Survey, resolveBotProtection, resolveMapConfig } from 'veysur-common'

import {
  RepoSurvey,
  RepoSurveyLanguageSnapshot,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  RepoSurveyPublication,
  RepoSettingSurvey,
} from 'model'
import { mergeSurveyLanguageSnapshots } from 'model/common'
import { contextForProject } from 'common'
import type { ServiceBotProtection } from '../ServiceBotProtection'

export class ServiceSurveyParticipantSnapshot extends Service {
  constructor() {
    super({
      name: 'surveyParticipantSnapshot',
    })
  }

  async get({ surveyId, projectId, lang, aclContext = undefined }) {
    return await this._getSnapshot({
      surveyId,
      projectId,
      lang,
      withData: true,
      resumeSnapshotId: aclContext?.snapshotId,
    })
  }

  async getPartial({ surveyId, projectId }) {
    return await this._getSnapshot({
      surveyId,
      projectId,
      lang: null,
      withData: false,
    })
  }

  async _getSnapshot({
    surveyId,
    projectId,
    lang,
    withData,
    resumeSnapshotId = undefined,
  }: {
    surveyId: string
    projectId: string
    lang: string | null
    withData: boolean
    resumeSnapshotId?: string
  }) {
    const context = contextForProject(projectId)
    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')
    const repoSurveySnapshotPartial = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const repoSurveySnapshot =
      this.getRepo<RepoSurveySnapshot>('surveySnapshot')
    const repoSurveyLanguageSnapshot = this.getRepo<RepoSurveyLanguageSnapshot>(
      'surveyLanguageSnapshot',
    )

    // A resumed participant must see the exact snapshot their in-progress
    // response is tagged against (see ServiceAuthParticipant.auth()) rather
    // than whatever is currently live — otherwise the questions they answer
    // don't match the snapshot their save() records them against.
    let snapshotId = resumeSnapshotId

    if (!snapshotId) {
      const publication = await repoPublication.findOne(
        {
          surveyId,
          stoppedAt: null,
        },
        { context },
      )

      if (!publication) {
        throw new ServerErrorNotFound('Survey not published')
      }

      snapshotId = publication.snapshotId
    }

    const snapshot = await repoSurveySnapshotPartial.findOne(
      {
        _id: snapshotId,
      },
      { context },
    )

    if (!snapshot) {
      throw new ServerErrorNotFound('Snapshot not found')
    }

    if (!withData) {
      return { snapshot }
    }

    const snapshotData = await repoSurveySnapshot.findOne(
      { snapshotId: snapshot._id },
      { context },
    )

    if (!snapshotData) {
      throw new ServerErrorNotFound('Snapshot data not found')
    }

    // Resolve languages: requested lang + the default lang frozen at publish time
    const defaultLang = snapshot.surveyPartial?.language?.default
    const langCodes = Array.from(
      new Set([lang, defaultLang].filter(Boolean) as string[]),
    )
    const survey = await this.getGatedSurveyPresentation(
      await mergeSurveyLanguageSnapshots(
        repoSurveyLanguageSnapshot,
        snapshotData.survey,
        snapshot._id,
        langCodes,
        context,
      ),
      projectId,
    )

    const settingSurveyData = await this.getGatedSettingSurvey(
      projectId,
      context,
      surveyId,
    )

    return {
      snapshot,
      snapshotData: { ...snapshotData, survey },
      settingSurveyData,
    }
  }

  /**
   * Load the project's survey settings as a participant may see them:
   * noBrand is suppressed if the project no longer qualifies for branding
   * removal (see isNoBrandAvailable), even though the setting itself is still
   * stored as true, `botProtection` carries only the provider and site key, and `maps` carries the effective provider and Google key
   * (survey key, else project key, over deployment key) in place of the
   * stored override. Pass the survey id to apply that survey's own overrides.
   */
  async getGatedSettingSurvey(
    projectId: string,
    context: DataSourceContext,
    surveyId?: string,
  ) {
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')
    const settingSurvey = await repoSettingSurvey.findOne({}, { context })
    if (!settingSurvey) return settingSurvey

    const survey = surveyId
      ? await this.getRepo<RepoSurvey>('survey').findOne(
          { _id: surveyId },
          { context },
        )
      : undefined
    const botProtectionService =
      this.getService<ServiceBotProtection>('botProtection')

    const gated = {
      ...settingSurvey,
      maps: resolveMapConfig(
        this.config.model.app.maps,
        survey
          ? survey.getMaps(settingSurvey).googleApiKey
          : settingSurvey.maps?.googleApiKey,
      ),
      // Provider and site key only; the secret key never leaves the API
      botProtection: resolveBotProtection(
        botProtectionService.effectiveSetting({
          survey: survey?.botProtection,
          project: settingSurvey.botProtection,
        }),
        true,
      ),
    }

    if (
      gated.presentation?.noBrand &&
      !(await this.isNoBrandAvailable(projectId))
    ) {
      gated.presentation = { ...gated.presentation, noBrand: false }
    }
    return gated
  }

  /**
   * Suppress the survey's own (publish-time-frozen) presentation.noBrand if the
   * project no longer qualifies for branding removal (see isNoBrandAvailable),
   * even though the value was baked in as true at publish.
   */
  private async getGatedSurveyPresentation(survey: Survey, projectId: string) {
    if (!survey?.presentation?.noBrand) {
      return survey
    }

    if (await this.isNoBrandAvailable(projectId)) {
      return survey
    }

    return {
      ...survey,
      presentation: { ...survey.presentation, noBrand: false },
    }
  }

  async isNoBrandAllowed(projectId: string): Promise<boolean> {
    return this.isNoBrandAvailable(projectId)
  }

  /**
   * Whether the no-brand presentation option applies for this project. Core
   * (self-hosted) has no per-project entitlements, so it is always available.
   * An extension overrides this. Extension seam.
   */
  protected async isNoBrandAvailable(_projectId: string): Promise<boolean> {
    return true
  }
}

export default ServiceSurveyParticipantSnapshot
