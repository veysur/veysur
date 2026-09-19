import {
  Service,
  ServerErrorBadRequest,
  ServerErrorForbidden,
  ServerErrorUnauthorized,
} from 'mzen-server'
import * as bcryptjs from 'bcryptjs'
import * as OTPAuth from 'otpauth'

import { DEFAULT_PROJECT_ID } from 'veysur-common'
import { RepoUser, ConfigJwt, ServiceProject } from 'model'
import { attachProjectOwn, ErrorRef } from 'model/common'
import { JWT_TYPE_PRE_AUTH } from 'acl/util/constant'
import { Jwt } from 'acl/util/Jwt'
import { ServiceAuthDirect } from './ServiceAuthDirect'

export interface ClientData {
  _id: string
  ip?: string
  userAgent?: string
  name?: string
  system?: string
  systemVersion?: string
  buildNumber?: string
  buildVersion?: string
  notificationToken?: string
}

export interface PreAuthJwtBase {
  _id: string
  type?: string
  requiresTwoFactorSetup?: boolean
}

export interface PreAuthJwtPayload extends PreAuthJwtBase {
  clientId: string
  ip?: string
  userAgent?: string
  deviceName?: string
  deviceSystem?: string
  deviceSystemVersion?: string
  buildNumber?: string
  buildVersion?: string
  notificationToken?: string
}

export class ServiceTwoFactor extends Service {
  constructor() {
    super({ name: 'twoFactor' })
  }

  // Called from ServiceAuthEmailPassword when 2FA is enabled or required.
  // Returns a short-lived pre-auth JWT instead of full tokens.
  async createPreAuthJwt(
    userId: string,
    clientData: ClientData,
    jwtConfig: ConfigJwt,
    requiresTwoFactorSetup = false,
  ) {
    const payload = {
      _id: userId,
      clientId: clientData._id,
      type: JWT_TYPE_PRE_AUTH,
      ip: clientData.ip,
      userAgent: clientData.userAgent,
      deviceName: clientData.name,
      deviceSystem: clientData.system,
      deviceSystemVersion: clientData.systemVersion,
      buildNumber: clientData.buildNumber,
      buildVersion: clientData.buildVersion,
      notificationToken: clientData.notificationToken,
      requiresTwoFactorSetup,
    }

    const preAuthToken = await Jwt.create(
      payload,
      jwtConfig,
      this.config.model.app.jwt.preAuthTtlSeconds,
    )

    if (requiresTwoFactorSetup) {
      return { requiresTwoFactorSetup: true as const, preAuthToken }
    }
    return { requiresTwoFactor: true as const, preAuthToken }
  }

  // Generate a new TOTP secret for the setup flow.
  // Does NOT persist — the secret is confirmed via verifyAndEnable() or enableAndLogin().
  async generateSetupData(requestArgs: {
    aclContext: { jwt: PreAuthJwtBase }
  }) {
    const { aclContext } = requestArgs
    if (
      aclContext.jwt.type === JWT_TYPE_PRE_AUTH &&
      !aclContext.jwt.requiresTwoFactorSetup
    ) {
      throw new ServerErrorForbidden()
    }
    const repoUser = this.getRepo<RepoUser>('user')
    const user = await repoUser.findOne(
      { _id: aclContext.jwt._id },
      { includeDeleted: true },
    )
    if (!user) throw new ServerErrorForbidden()

    const secret = new OTPAuth.Secret()
    const totp = new OTPAuth.TOTP({
      issuer: this.config.model.app.brandName,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    })

    return {
      secret: secret.base32,
      otpauthUri: totp.toString(),
    }
  }

  // Verify TOTP code against the candidate secret, then persist and enable 2FA.
  async verifyAndEnable(requestArgs: {
    code: string
    secret: string
    aclContext: { jwt: PreAuthJwtBase }
  }) {
    const { code, secret, aclContext } = requestArgs

    if (!this.verifyCode(secret, code)) {
      throw new ServerErrorBadRequest({
        ref: ErrorRef.INVALID_CODE,
        userMessage: 'Invalid code. Please try again.',
      })
    }

    const repoUser = this.getRepo<RepoUser>('user')
    await repoUser.updateOne(
      { _id: aclContext.jwt._id },
      {
        $set: {
          twoFactorSecret: secret,
          'twoFactorMeta.enabled': true,
          'twoFactorMeta.enabledAt': new Date(),
        },
      },
    )

    await this.modelManager.services.eventLog.log({
      action: 'user.2fa.enabled',
      userId: String(aclContext.jwt._id),
    })
  }

  // Verify TOTP during login (pre-auth phase), then issue full auth tokens.
  async verifyLogin(requestArgs: {
    code: string
    jwtConfig: ConfigJwt
    aclContext: { jwt: PreAuthJwtPayload }
  }) {
    const { code, jwtConfig, aclContext } = requestArgs
    const preAuthJwt = aclContext.jwt

    const repoUser = this.getRepo<RepoUser>('user')
    const userPopulate = {
      client: true,
      projectAdmin: true,
    }
    const user = await repoUser.findOne(
      { _id: preAuthJwt._id },
      { includeDeleted: true, populate: userPopulate },
    )
    if (!user)
      throw new ServerErrorUnauthorized({
        ref: ErrorRef.UNAUTHORIZED,
        userMessage: 'No account found.',
      })
    attachProjectOwn(
      user,
      await this.getService<ServiceProject>('project').getById(
        DEFAULT_PROJECT_ID,
      ),
    )

    if (!user.twoFactorMeta?.enabled || !user.twoFactorSecret) {
      throw new ServerErrorForbidden({
        ref: ErrorRef.TWO_FACTOR_NOT_ENABLED,
        userMessage: '2FA is not enabled on this account.',
      })
    }

    if (!this.verifyCode(user.twoFactorSecret, code)) {
      throw new ServerErrorUnauthorized({
        ref: ErrorRef.INVALID_CODE,
        userMessage: 'Invalid code. Please try again.',
      })
    }

    const clientData = {
      _id: preAuthJwt.clientId,
      ip: preAuthJwt.ip,
      userAgent: preAuthJwt.userAgent,
      name: preAuthJwt.deviceName,
      system: preAuthJwt.deviceSystem,
      systemVersion: preAuthJwt.deviceSystemVersion,
      buildNumber: preAuthJwt.buildNumber,
      buildVersion: preAuthJwt.buildVersion,
      notificationToken: preAuthJwt.notificationToken,
    }

    await this.modelManager.services.eventLog.log({
      action: 'user.login.2fa',
      userId: user._id,
    })

    return await this.getService<ServiceAuthDirect>('authDirect').loginDirect(
      user,
      clientData,
      jwtConfig,
      false,
    )
  }

  // Called from the forced-setup login flow (pre-auth token with requiresTwoFactorSetup).
  // Verifies the TOTP code, persists the secret, then issues full auth tokens.
  async enableAndLogin(requestArgs: {
    code: string
    secret: string
    jwtConfig: ConfigJwt
    aclContext: { jwt: PreAuthJwtPayload }
  }) {
    const { code, secret, jwtConfig, aclContext } = requestArgs
    const preAuthJwt = aclContext.jwt

    if (!preAuthJwt.requiresTwoFactorSetup) {
      throw new ServerErrorForbidden()
    }

    const repoUser = this.getRepo<RepoUser>('user')
    const userPopulate = {
      client: true,
      projectAdmin: true,
    }
    const user = await repoUser.findOne(
      { _id: preAuthJwt._id },
      { includeDeleted: true, populate: userPopulate },
    )
    if (!user)
      throw new ServerErrorUnauthorized({
        ref: ErrorRef.UNAUTHORIZED,
        userMessage: 'No account found.',
      })

    if (user.twoFactorMeta?.enabled) {
      throw new ServerErrorForbidden({
        ref: ErrorRef.TWO_FACTOR_ALREADY_ENABLED,
        userMessage: '2FA is already enabled on this account.',
      })
    }

    if (!this.verifyCode(secret, code)) {
      throw new ServerErrorUnauthorized({
        ref: ErrorRef.INVALID_CODE,
        userMessage: 'Invalid code. Please try again.',
      })
    }

    await repoUser.updateOne(
      { _id: preAuthJwt._id },
      {
        $set: {
          twoFactorSecret: secret,
          'twoFactorMeta.enabled': true,
          'twoFactorMeta.enabledAt': new Date(),
        },
      },
    )

    const clientData = {
      _id: preAuthJwt.clientId,
      ip: preAuthJwt.ip,
      userAgent: preAuthJwt.userAgent,
      name: preAuthJwt.deviceName,
      system: preAuthJwt.deviceSystem,
      systemVersion: preAuthJwt.deviceSystemVersion,
      buildNumber: preAuthJwt.buildNumber,
      buildVersion: preAuthJwt.buildVersion,
      notificationToken: preAuthJwt.notificationToken,
    }

    await this.modelManager.services.eventLog.log({
      action: 'user.login.2fa.setup',
      userId: user._id,
    })

    // Reload user with 2FA now enabled so the JWT reflects twoFactorEnabled: true
    const userWithTwoFactor = await repoUser.findOne(
      { _id: preAuthJwt._id },
      { includeDeleted: true, populate: userPopulate },
    )
    attachProjectOwn(
      userWithTwoFactor,
      await this.getService<ServiceProject>('project').getById(
        DEFAULT_PROJECT_ID,
      ),
    )

    return await this.getService<ServiceAuthDirect>('authDirect').loginDirect(
      userWithTwoFactor,
      clientData,
      jwtConfig,
      false,
    )
  }

  // Disable 2FA — verifies password then clears secret and enabled flag.
  async disable(requestArgs: {
    password: string
    aclContext: { jwt: PreAuthJwtBase }
  }) {
    const { password, aclContext } = requestArgs
    const repoUser = this.getRepo<RepoUser>('user')
    const user = await repoUser.findOne(
      { _id: aclContext.jwt._id },
      { includeDeleted: true },
    )
    if (!user) throw new ServerErrorForbidden()

    const match = await bcryptjs.compare(password, user.password)
    if (!match) {
      throw new ServerErrorBadRequest({
        ref: ErrorRef.INVALID_PASSWORD,
        userMessage: 'Incorrect password.',
      })
    }

    await repoUser.updateOne(
      { _id: aclContext.jwt._id },
      {
        $set: {
          twoFactorSecret: null,
          'twoFactorMeta.enabled': false,
          'twoFactorMeta.enabledAt': null,
        },
      },
    )

    await this.modelManager.services.eventLog.log({
      action: 'user.2fa.disabled',
      userId: String(aclContext.jwt._id),
    })
  }

  // Permanently dismiss the "enable 2FA?" prompt.
  async dismissPrompt(requestArgs: { aclContext: { jwt: PreAuthJwtBase } }) {
    const { aclContext } = requestArgs
    const repoUser = this.getRepo<RepoUser>('user')
    await repoUser.updateOne(
      { _id: aclContext.jwt._id },
      { $set: { 'twoFactorMeta.prompt.dismissed': true } },
    )
  }

  private verifyCode(secret: string, code: string): boolean {
    try {
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      })
      const delta = totp.validate({ token: code, window: 1 })
      return delta !== null
    } catch {
      return false
    }
  }
}

export default ServiceTwoFactor
