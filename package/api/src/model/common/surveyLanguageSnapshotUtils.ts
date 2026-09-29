import { DataSourceContext } from '@datacapy/om'
import { mergeSurveyLanguageIntoSurvey, Survey } from 'veysur-common'
import type { RepoSurveyLanguageSnapshot } from 'model'

export async function mergeSurveyLanguageSnapshots(
  repo: RepoSurveyLanguageSnapshot,
  survey: Survey,
  snapshotId: string,
  langCodes: string[],
  context: DataSourceContext,
): Promise<Survey> {
  if (!langCodes.length) return survey
  const snapshots = await repo.find(
    { snapshotId, languageCode: { $in: langCodes } },
    { context },
  )
  return snapshots.length
    ? mergeSurveyLanguageIntoSurvey(survey, snapshots)
    : survey
}
