import { Repo, TYPE_HINT_TIMESTAMP } from '@datacapy/server'
import { User, ServiceVerifyEmail } from 'model'

export class RepoUser extends Repo<User> {
  services: {
    verifyEmail: ServiceVerifyEmail
  }

  constructor() {
    super({
      name: 'user',
      autoIndex: false,
      softDelete: true,
      relations: {
        projectAdmin: {
          alias: 'projectAdmin',
          type: 'hasMany',
          repo: 'projectAdmin',
          key: 'userId',
          autoPopulate: false,
          recursion: 1,
        },
        client: {
          alias: 'client',
          type: 'hasMany',
          repo: 'userClient',
          key: 'userId',
          autoPopulate: false,
          recursion: 0,
        },
      },
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        email: {
          spec: { email: 1 },
          options: { unique: true },
        },
        deletedAt: {
          spec: { deletedAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
      },
    })
  }
}

export default RepoUser
