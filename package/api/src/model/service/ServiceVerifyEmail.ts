import {
  Service,
  ServerErrorUnauthorized,
  ServerErrorBadRequest,
} from '@datacapy/server'
import { User, StringRandom } from 'veysur-common'

import { RepoUser, ServiceUser, ServiceEmail } from 'model'
import { ErrorRef } from 'model/common'
import { buildAppUrl } from 'config/buildAppUrl'

export class ServiceVerifyEmail extends Service {
  constructor() {
    super({
      name: 'verifyEmail',
    })
  }

  async sendForUser(user: Partial<User>) {
    const serviceEmail = this.getService<ServiceEmail>('email')
    await serviceEmail.frequencyLimit({
      userId: user._id,
      type: 'verify-email',
      rules: [
        { multiplier: 3, unit: 'minutes', limit: 2 },
        { multiplier: 1, unit: 'hours', limit: 6 },
        { multiplier: 1, unit: 'days', limit: 12 },
        { multiplier: 1, unit: 'months', limit: 30 },
      ],
    })

    await serviceEmail.frequencyLimit({
      to: user.email,
      type: 'verify-email',
      rules: [
        { multiplier: 3, unit: 'minutes', limit: 2 },
        { multiplier: 1, unit: 'hours', limit: 6 },
        { multiplier: 1, unit: 'days', limit: 12 },
        { multiplier: 1, unit: 'months', limit: 30 },
      ],
    })

    const token = this.generateVerifyToken()
    let tokens = [
      ...(user.emailMeta?.verify?.token ? user.emailMeta.verify.token : []),
    ]
    tokens.unshift(token) // push to the beginning of the array
    tokens = tokens.slice(0, 3) // only the keep the latest 3 tokens

    const repoUser = this.getRepo<RepoUser>('user')
    await repoUser.updateOne(
      { _id: user._id },
      {
        $set: {
          'emailMeta.verify.token': tokens,
        },
      },
    )

    const verifyParams = new URLSearchParams({
      email: user.email,
      token: token.token,
    })
    const verifyUrl = buildAppUrl(
      this.config.model.app,
      'account',
      `verify-email?${verifyParams.toString()}`,
    )

    // Send email verify
    await serviceEmail.send({
      type: 'verify-email',
      to: user.email,
      subject: 'Email Verification',
      userId: user._id,
      templateData: {
        user: {
          nameFirst: user.nameFirst,
        },
        token: token.token.toUpperCase(),
        verifyUrl,
      },
      data: { token: token.token, verifyUrl },
    })
  }

  generateVerifyToken() {
    const ttl = this.config.model.app.emailVerifyTokenTtlSeconds
    const expiresAt = new Date()
    expiresAt.setTime(expiresAt.getTime() + ttl * 1000)

    const token = StringRandom.genNumeric(6)

    const verifyToken = {
      token,
      ttl,
      createdAt: new Date(),
      expiresAt,
      failCount: 0,
    }

    return verifyToken
  }

  async send({ aclContext }) {
    const repoUser = this.getRepo<RepoUser>('user')
    const user = await repoUser.findOne({
      _id: aclContext.jwt._id,
    })
    if (!user) {
      throw new ServerErrorUnauthorized('User not found')
    }
    return this.sendForUser(user)
  }

  async verify({ email, token, aclContext }) {
    if (!email) {
      throw new ServerErrorUnauthorized('No email address specified')
    }
    const repoUser = this.getRepo<RepoUser>('user')
    const user = await repoUser.findOne({ email })

    const maxInvalidTokenAttempts = 10
    const minTokenLength = 4

    if (!user) {
      throw new ServerErrorUnauthorized('User not found')
    }

    if (!user.emailMeta.verify.status.isVerified) {
      const emailMeta = user.emailMeta
      // Get the verify token that matches the input - if one exists
      const verifyTokens =
        (emailMeta && emailMeta.verify && emailMeta.verify.token) || []
      const verifyTokensMatched = verifyTokens
        .concat()
        .filter((verifyToken) => {
          return (
            token.length > minTokenLength &&
            verifyToken.token == token.toLowerCase()
          )
        })
      const verifyToken = verifyTokensMatched.shift()

      if (verifyToken && verifyToken.failCount >= maxInvalidTokenAttempts) {
        // Max attempts reached
        throw new ServerErrorUnauthorized({
          ref: ErrorRef.MAX_ATTEMPTS,
          message: 'Max verification attempts reached',
        })
      } else if (verifyToken && verifyToken.expiresAt < new Date()) {
        // Token is no longer valid
        throw new ServerErrorUnauthorized({
          ref: ErrorRef.EXPIRED,
          message: 'Verification token expired',
        })
      } else if (!token || !verifyToken) {
        // Provided token doesn't appear valid or doesn't match
        // - increment failCount
        const verifyTokensUpdated = verifyTokens.map((verifyToken) => {
          verifyToken.failCount = verifyToken.failCount + 1
          return verifyToken
        })

        await repoUser.updateOne(
          { _id: user._id },
          { $set: { 'emailMeta.verify.token': verifyTokensUpdated } },
        )

        throw new ServerErrorBadRequest({
          ref: ErrorRef.INVALID_TOKEN,
          message: 'Invalid verification token',
        })
      } else {
        // Provided token matches - set isVerified
        await repoUser.updateOne(
          { _id: user._id },
          {
            $set: {
              'emailMeta.verify.status.isVerified': true,
              'emailMeta.verify.status.isVerifiedAt': new Date(),
              'emailMeta.verify.token': [],
            },
          },
        )
      }
    }

    // Verification can be performed by anyone with a valid email/token combination
    // If the user verifying the email address is authorised return the user data
    // - otherwise just return true to indicate success
    let result: User | boolean = true
    if (
      aclContext &&
      aclContext.jwt &&
      String(aclContext.jwt._id) == String(user._id)
    ) {
      const serviceUser = this.getService<ServiceUser>('user')
      result = await serviceUser.getForClient({ _id: user._id })
    }
    return result
  }
}

export default ServiceVerifyEmail
