import { SurveySection } from 'veysur-common/model/constructor'
import { Repo, TYPE_HINT_TIMESTAMP } from 'mzen-server'

export class RepoSurveySection extends Repo<SurveySection> {
  constructor() {
    super({
      name: 'surveySection',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {},
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        updatedAt: {
          spec: { updatedAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        createdById: {
          spec: { createdById: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        surveyId: {
          spec: {
            surveyId: 1,
            createdAt: -1,
          },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
      },
    })
  }
}

export default RepoSurveySection
