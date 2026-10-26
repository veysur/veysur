import { Repo, repib } from '@datacapy/server'
import { Project } from 'veysur-common'

export class RepoProject extends Repo<Project> {
  constructor() {
    super({
      name: 'project',
      autoIndex: false,
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
      },
    })
  }
}

export default RepoProject
