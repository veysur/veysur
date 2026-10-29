import { Repo, ServerErrorBadRequest, RepoIndexBuilder as repib } from '@datacapy/server'
import { SettingProject } from 'veysur-common'

export class RepoSettingProject extends Repo<SettingProject> {
  constructor() {
    super({
      name: 'settingProject',
      dataSource: 'project',
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
    const settingProject = new SettingProject(data)

    await this.insertOne(settingProject, options)

    return settingProject
  }
}

export default RepoSettingProject
