import { Repo, relb, repib } from '@datacapy/server'
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
        projectAdmin: relb
          .hasMany('projectAdmin')
          .key('userId')
          .autoPopulate(false)
          .recursion(1),
        client: relb
          .hasMany('userClient')
          .key('userId')
          .autoPopulate(false)
          .recursion(0),
      },
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        email: repib.asc('email').unique(),
        deletedAt: repib.desc('deletedAt').timestamp(),
      },
    })
  }
}

export default RepoUser
