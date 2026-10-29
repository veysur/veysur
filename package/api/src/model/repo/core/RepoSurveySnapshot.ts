import { SurveySnapshot } from 'veysur-common'
import { Repo, RepoIndexBuilder as repib } from '@datacapy/server'

export class RepoSurveySnapshot extends Repo<SurveySnapshot> {
  constructor() {
    super({
      name: 'surveySnapshot',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {},
      indexes: {
        snapshotId: repib.asc('snapshotId'),
        surveyId: repib.asc('survey._id'),
      },
    })
  }
}

export default RepoSurveySnapshot
