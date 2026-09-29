import {
  SurveySnapshotPartial,
  SurveySnapshot,
  SettingSurvey,
} from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

import { Api, ErrorRest } from 'model'

// 'snapshot' here refers to survey snapshot
export interface SurveyParticipantSnapshotResponse {
  snapshot: PropsOf<SurveySnapshotPartial>
  snapshotData: PropsOf<SurveySnapshot>
  settingSurveyData: PropsOf<SettingSurvey>
}

export class SurveyParticipantSnapshotApi extends Api {
  async getSurveySnapshot(
    surveyId: string,
    authToken: string,
    lang?: string,
  ): Promise<SurveyParticipantSnapshotResponse> {
    try {
      return await this.getClient().get<SurveyParticipantSnapshotResponse>(
        `/survey-participant-snapshot/${surveyId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          params: lang ? { lang } : undefined,
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
