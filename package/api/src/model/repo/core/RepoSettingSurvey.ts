import { Repo, ServerErrorBadRequest, TYPE_HINT_TIMESTAMP } from 'mzen-server'
import { SettingSurvey } from 'veysur-common'

export class RepoSettingSurvey extends Repo<SettingSurvey> {
  constructor() {
    super({
      name: 'settingSurvey',
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
      },
    })
  }

  async create(data = {}, options?) {
    const { isValid, errors } = await this.schema.validatePaths(data)
    if (!isValid) {
      throw new ServerErrorBadRequest(errors)
    }

    await this.schema.applyFilters(data)
    const surveySetting = new SettingSurvey(data)

    await this.insertOne(surveySetting, options)

    return surveySetting
  }
}

export default RepoSettingSurvey
