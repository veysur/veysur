import { SurveySection } from 'veysur-common/model/constructor'
import { Repo, repib } from '@datacapy/server'

export class RepoSurveySection extends Repo<SurveySection> {
  constructor() {
    super({
      name: 'surveySection',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {},
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        updatedAt: repib.desc('updatedAt').timestamp(),
        createdById: repib
          .asc('createdById')
          .desc('createdAt')
          .timestamp('createdAt'),
        surveyId: repib
          .asc('surveyId')
          .desc('createdAt')
          .timestamp('createdAt'),
      },
    })
  }
}

export default RepoSurveySection
