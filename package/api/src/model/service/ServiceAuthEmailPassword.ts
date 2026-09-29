import { Service, ServerErrorUnauthorized } from '@datacapy/server'
import * as bcryptjs from 'bcryptjs'

import { RepoUser, ServiceProject } from 'model'
import { ErrorRef } from 'model/common'

import { ServiceAuthDirect } from './ServiceAuthDirect'
import { ServiceTwoFactor } from './ServiceTwoFactor'

const errorUserNotFound = new ServerErrorUnauthorized({
  ref: ErrorRef.UNAUTHORIZED,
  userMessage: 'No account found with those details.',
})

const userPopulate = {
  client: true,
  projectAdmin: true,
}

export class ServiceAuthEmailPassword extends Service {
  constructor() {
    super({
      name: 'authEmailPassword',
    })
  }

  async login(requestArgs) {
    const repoUser = this.getRepo<RepoUser>('user')
    const {
      email,
      password,
      clientId,
      ip,
      userAgent,
      deviceName,
      deviceSystem,
      deviceSystemVersion,
      buildNumber,
      buildVersion,
      notificationToken,
      jwtConfig,
    } = requestArgs
    const user = await repoUser.findOne(
      { email },
      {
        includeDeleted: true,
        populate: userPopulate,
      },
    )
    // Anonymised (permanently, hard-deleted) accounts must remain
    // indistinguishable from an account that never existed. Soft-deleted
    // accounts are allowed to log in normally - the app shows a restore
    // prompt once authenticated.
    if (user && user.password && !user.anonymizedAt) {
      await this.getService<ServiceProject>('project').attachOwnership(user)

      const passwordsMatch = await bcryptjs.compare(password, user.password)
      if (!passwordsMatch) {
        // Invalid password
        throw errorUserNotFound
      }
      await this.modelManager.services.eventLog.log({
        action: 'user.login',
        userId: user._id,
      })

      const clientData = {
        _id: clientId,
        name: deviceName,
        ip,
        userAgent,
        system: deviceSystem,
        systemVersion: deviceSystemVersion,
        buildNumber,
        buildVersion,
        notificationToken,
      }

      if (user.twoFactorMeta?.enabled) {
        return await this.getService<ServiceTwoFactor>(
          'twoFactor',
        ).createPreAuthJwt(user._id, clientData, jwtConfig)
      }

      if (user.role?.startsWith('platform')) {
        return await this.getService<ServiceTwoFactor>(
          'twoFactor',
        ).createPreAuthJwt(user._id, clientData, jwtConfig, true)
      }

      return await this.getService<ServiceAuthDirect>('authDirect').loginDirect(
        user,
        clientData,
        jwtConfig,
        false,
      )
    } else {
      // User not found
      throw errorUserNotFound
    }
  }
}

export default ServiceAuthEmailPassword
