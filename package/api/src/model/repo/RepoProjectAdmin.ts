import { Repo, relb, repib } from '@datacapy/server'
import { ProjectAdmin } from 'veysur-common/model/constructor'

export class RepoProjectAdmin extends Repo<ProjectAdmin> {
  constructor() {
    super({
      name: 'projectAdmin',
      autoIndex: false,
      relations: {
        user: relb
          .belongsToOne('user')
          .key('userId')
          .autoPopulate(false)
          .recursion(0),
        invitedBy: relb
          .belongsToOne('user')
          .key('createdById')
          .autoPopulate(false)
          .recursion(0),
      },
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        updatedAt: repib.desc('updatedAt').timestamp(),
        createdById: repib
          .asc('createdById')
          .desc('createdAt')
          .timestamp('createdAt'),
        userId: repib.asc('userId').desc('createdAt').timestamp('createdAt'),
        projectId: repib
          .asc('projectId')
          .desc('createdAt')
          .timestamp('createdAt'),
        userIdProjectId: repib
          .asc('userId')
          .asc('projectId')
          .desc('createdAt')
          .timestamp('createdAt'),
        code: repib.asc('code').unique().sparse(),
        status: repib.asc('status').asc('projectId'),
        emailProjectId: repib.asc('email').asc('projectId'),
      },
    })
  }
}

export default RepoProjectAdmin
