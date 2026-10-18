import {
  Repo,
  ServerErrorBadRequest,
  TYPE_HINT_TIMESTAMP,
} from '@datacapy/server'
import { SettingProject } from 'veysur-common'

export class RepoSettingProject extends Repo<SettingProject> {
  constructor() {
    super({
      name: 'settingProject',
      dataSource: 'project',
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
    const settingProject = new SettingProject(data)

    await this.insertOne(settingProject, options)

    return settingProject
  }
}

export default RepoSettingProject
