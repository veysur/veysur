import { UserClient } from 'veysur-common'
import { Repo, TYPE_HINT_TIMESTAMP } from '@datacapy/server'

export class RepoUserClient extends Repo<UserClient> {
  constructor() {
    super({
      name: 'userClient',
      autoIndex: false,
      relations: {
        user: {
          alias: 'user',
          type: 'belongsToOne',
          repo: 'user',
          key: 'userId',
          autoPopulate: false,
          recursion: 1,
        },
      },
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        userId: {
          spec: { userId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
      },
    })
  }
}

export default RepoUserClient
