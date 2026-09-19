import { Patch, SettingSurvey } from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { Api } from 'model'

export class SettingSurveyApi extends Api {
  async getOne(): Promise<PropsOf<SettingSurvey>> {
    return await this.getClient().get<PropsOf<SettingSurvey>>('/setting-survey')
  }

  async patch(patches: Patch[]): Promise<PropsOf<SettingSurvey>> {
    return await this.getClient().patch<PropsOf<SettingSurvey>>(
      '/setting-survey',
      {
        patches,
      },
    )
  }
}
