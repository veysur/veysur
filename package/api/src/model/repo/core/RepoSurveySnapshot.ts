import { SurveySnapshot } from 'veysur-common'
import { Repo } from '@datacapy/server'

export class RepoSurveySnapshot extends Repo<SurveySnapshot> {
  constructor() {
    super({
      name: 'surveySnapshot',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {},
      indexes: {
        snapshotId: { spec: { snapshotId: 1 } },
        surveyId: {
          spec: {
            'survey._id': 1,
          },
        },
      },
    })
  }
}

export default RepoSurveySnapshot
