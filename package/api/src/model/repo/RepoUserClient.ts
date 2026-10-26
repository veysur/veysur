import { UserClient } from 'veysur-common'
import { Repo, relb, repib } from '@datacapy/server'

export class RepoUserClient extends Repo<UserClient> {
  constructor() {
    super({
      name: 'userClient',
      autoIndex: false,
      relations: {
        user: relb
          .belongsToOne('user')
          .key('userId')
          .autoPopulate(false)
          .recursion(1),
      },
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        userId: repib.asc('userId').desc('createdAt').timestamp('createdAt'),
      },
    })
  }
}

export default RepoUserClient
