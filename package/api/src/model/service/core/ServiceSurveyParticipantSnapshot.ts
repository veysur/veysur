import { Service, ServerErrorNotFound } from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import { Survey } from 'veysur-common'

import {
  RepoSurveyLanguageSnapshot,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  RepoSurveyPublication,
  RepoSettingSurvey,
} from 'model'
import { mergeSurveyLanguageSnapshots } from 'model/common'

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
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
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
    )

    return {
      snapshot,
      snapshotData: { ...snapshotData, survey },
      settingSurveyData,
    }
  }

  /**
   * Load the project's survey presentation settings, suppressing noBrand if the
   * project no longer qualifies for branding removal (see isNoBrandAvailable),
   * even though the setting itself is still stored as true.
   */
  private async getGatedSettingSurvey(
    projectId: string,
    context: DataSourceContext,
  ) {
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')
    const settingSurvey = await repoSettingSurvey.findOne({}, { context })

    if (!settingSurvey?.presentation?.noBrand) {
      return settingSurvey
    }

    if (await this.isNoBrandAvailable(projectId)) {
      return settingSurvey
    }

    return {
      ...settingSurvey,
      presentation: { ...settingSurvey.presentation, noBrand: false },
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

  /**
   * Whether the no-brand presentation option applies for this project. Core
   * (self-hosted) has no per-project entitlements, so it is always available.
   * An overlay overrides this. Overlay seam.
   */
  protected async isNoBrandAvailable(_projectId: string): Promise<boolean> {
    return true
  }
}

export default ServiceSurveyParticipantSnapshot
