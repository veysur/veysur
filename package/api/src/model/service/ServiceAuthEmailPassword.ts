import { Service, ServerErrorUnauthorized } from '@datacapy/server'
import type { tagsEndpoint as e } from '@datacapy/server'
import * as bcryptjs from 'bcryptjs'

import { BotCheck } from 'veysur-common'
import { RepoUser, ServiceProject } from 'model'
import type { ConfigJwt } from 'model/entity/ConfigJwt'
import { ErrorRef } from 'model/common'

import { ServiceBotProtection } from './ServiceBotProtection'
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

export interface LoginRequest {
  email: string & e.Body
  password: string & e.Body
  botCheck?: BotCheck & e.Body
  ip?: string & e.Request<'ip'>
  clientId?: string & e.Header<'Client-Id'>
  userAgent?: string & e.Header<'User-Agent'>
  deviceName?: string & e.Header<'Device-Name'>
  deviceSystem?: string & e.Header<'Device-System'>
  deviceSystemVersion?: string & e.Header<'Device-System-Version'>
  buildVersion?: string & e.Header<'Build-Version'>
  buildNumber?: string & e.Header<'Build-Number'>
  notificationToken?: string & e.Header<'Notification-Token'>
  jwtConfig: ConfigJwt & e.Config<'model.app.jwt'>
}

/** @endpoints authEmailPassword */
export class ServiceAuthEmailPassword extends Service {
  constructor() {
    super({
      name: 'authEmailPassword',
    })
  }

  /**
   * The public login: checks the bot check, then authenticates.
   *
   * @route post /login
   * @endpoint postEmailPassword
   * @acl public
   */
  async login(requestArgs: LoginRequest) {
    await this.getService<ServiceBotProtection>(
      'botProtection',
    ).assertAccountBotCheck(requestArgs.botCheck)
    return this.authenticate(requestArgs)
  }

  /**
   * Authenticate with no bot check, for a caller that has just created the
   * account itself (signup, invite acceptance) and checked it already.
   */
  async authenticate(requestArgs: LoginRequest & { deviceId?: string }) {
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
