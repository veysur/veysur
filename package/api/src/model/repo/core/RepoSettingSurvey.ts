import { Repo, ServerErrorBadRequest, repib } from '@datacapy/server'
import { SettingSurvey } from 'veysur-common'

export class RepoSettingSurvey extends Repo<SettingSurvey> {
  constructor() {
    super({
      name: 'settingSurvey',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {},
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        updatedAt: repib.desc('updatedAt').timestamp(),
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
