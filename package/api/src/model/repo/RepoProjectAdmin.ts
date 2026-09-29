import { Repo, TYPE_HINT_TIMESTAMP } from '@datacapy/server'
import { ProjectAdmin } from 'veysur-common/model/constructor'

export class RepoProjectAdmin extends Repo<ProjectAdmin> {
  constructor() {
    super({
      name: 'projectAdmin',
      autoIndex: false,
      relations: {
        user: {
          alias: 'user',
          type: 'belongsToOne',
          repo: 'user',
          key: 'userId',
          autoPopulate: false,
          recursion: 0,
        },
        invitedBy: {
          alias: 'invitedBy',
          type: 'belongsToOne',
          repo: 'user',
          key: 'createdById',
          autoPopulate: false,
          recursion: 0,
        },
      },
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
        userId: {
          spec: { userId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        projectId: {
          spec: { projectId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        userIdProjectId: {
          spec: { userId: 1, projectId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        code: {
          spec: { code: 1 },
          options: { unique: true, sparse: true },
        },
        status: {
          spec: { status: 1, projectId: 1 },
        },
        emailProjectId: {
          spec: { email: 1, projectId: 1 },
        },
      },
    })
  }
}

export default RepoProjectAdmin
