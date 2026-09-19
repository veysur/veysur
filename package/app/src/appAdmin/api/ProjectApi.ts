import { Project } from 'veysur-common'

import { Api } from 'model/api/Api'
import { ErrorRest } from 'model/api/ErrorRest'

export class ProjectApi extends Api {
  async updateTimezone(projectId: string, timezone: string): Promise<Project> {
    try {
      const result = await this.getClient().put<Project>(
        `project/${projectId}/timezone`,
        { timezone },
      )
      return result
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}

export default ProjectApi
