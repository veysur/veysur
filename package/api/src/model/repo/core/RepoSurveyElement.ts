import { SurveyElementBase } from 'veysur-common/model/constructor'
import { Repo, TYPE_HINT_TIMESTAMP } from 'mzen-server'

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
        sectionId: {
          spec: {
            sectionId: 1,
            surveyId: 1,
            createdAt: -1,
          },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
      },
    })
  }
}

export default RepoSurveyElement
