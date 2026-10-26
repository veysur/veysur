import { SurveyElementBase } from 'veysur-common/model/constructor'
import { Repo, repib } from '@datacapy/server'

// The `surveyElement` schema persists both element kinds; on read,
// `SurveyElementCollection.fromArray` / `SchemaSurveyElement.constructCollection`
// instantiate each row as `SurveyQuestion` or `SurveyContent` by its `kind`.
// The repo generic is the shared base — callers narrow with
// `isSurveyQuestion` / `isSurveyContent`.
export class RepoSurveyElement extends Repo<SurveyElementBase> {
  constructor() {
    super({
      name: 'surveyElement',
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
        sectionId: repib
          .asc('sectionId')
          .asc('surveyId')
          .desc('createdAt')
          .timestamp('createdAt'),
      },
    })
  }
}

export default RepoSurveyElement
