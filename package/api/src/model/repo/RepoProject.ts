import { Repo, TYPE_HINT_TIMESTAMP } from 'mzen-server'
import { Project } from 'veysur-common'

export class RepoProject extends Repo<Project> {
  constructor() {
    super({
      name: 'project',
      autoIndex: false,
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
      },
    })
  }
}

export default RepoProject
