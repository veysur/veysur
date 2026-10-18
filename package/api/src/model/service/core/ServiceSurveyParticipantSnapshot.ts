import { Service, ServerErrorNotFound } from '@datacapy/server'
import { DataSourceContext } from '@datacapy/om'
import { Survey, resolveBotProtection, resolveMapConfig } from 'veysur-common'

import {
  RepoSurveyLanguageSnapshot,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  RepoSurveyPublication,
  RepoSettingProject,
  RepoSettingSurvey,
} from 'model'
import { mergeSurveyLanguageSnapshots } from 'model/common'
import { contextForProject } from 'common'

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

    const [settingSurveyData, settingProjectData] = await Promise.all([
      this.getGatedSettingSurvey(projectId, context),
      this.getGatedSettingProject(context),
    ])

    return {
      snapshot,
      snapshotData: { ...snapshotData, survey },
      settingSurveyData,
      settingProjectData,
    }
  }

  /**
   * Load the project's survey settings as a participant may see them:
   * noBrand is suppressed if the project no longer qualifies for branding
   * removal (see isNoBrandAvailable), even though the setting itself is still
   * stored as true.
   */
  async getGatedSettingSurvey(projectId: string, context: DataSourceContext) {
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')
    const settingSurvey = await repoSettingSurvey.findOne({}, { context })
    if (!settingSurvey) return settingSurvey

    const gated = { ...settingSurvey }

    if (
      gated.presentation?.noBrand &&
      !(await this.isNoBrandAvailable(projectId))
    ) {
      gated.presentation = { ...gated.presentation, noBrand: false }
    }
    return gated
  }

  /**
   * The project's provider settings as a participant may see them: `maps`
   * carries the effective provider and Google key (project key over
   * deployment key) in place of the stored override, and `botProtection`
   * carries only the provider and site key, never the secret.
   */
  async getGatedSettingProject(context: DataSourceContext) {
    const settingProject = await this.getRepo<RepoSettingProject>(
      'settingProject',
    ).findOne({}, { context })

    return {
      maps: resolveMapConfig(
        this.config.model.app.maps,
        settingProject?.maps?.googleApiKey,
      ),
      botProtection: resolveBotProtection(settingProject?.botProtection, true),
    }
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
