import {
  Service,
  ServerErrorUnauthorized,
  ServerErrorBadRequest,
  ServerErrorNotFound,
} from '@datacapy/server'
import { StringRandom, validatePassword } from 'veysur-common'
import * as bcryptjs from 'bcryptjs'
import { createHash, timingSafeEqual } from 'crypto'

// Constant-time regardless of input length - timingSafeEqual itself throws
// on mismatched buffer lengths, so hash both sides to a fixed length first
// rather than comparing the raw (variable-length, attacker-influenced)
// reset-token guess directly.
function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

import { RepoUser, ServiceEmail } from 'model'
import { ErrorRef } from 'model/common'
import { buildAppUrl } from 'config/buildAppUrl'

export class ServicePassword extends Service {
  repos: {
    user: RepoUser
  }

  constructor() {
    super({
      name: 'password',
    })
  }

  generateToken() {
    const createdAt = new Date()
    const ttl = this.config.model.app.passwordResetTokenTtlSeconds
    const expiresAt = new Date()
    expiresAt.setTime(expiresAt.getTime() + ttl * 1000)

    const token = StringRandom.genNumeric(6)

    const passwordResetToken = {
      token,
      ttl,
      createdAt,
      expiresAt,
      failCount: 0,
    }

    return passwordResetToken
  }

  async resetEmail({ email }) {
    const serviceEmail = this.getService<ServiceEmail>('email')

    await serviceEmail.frequencyLimit({
      to: email,
      type: 'password-reset',
      rules: [
        { multiplier: 1, unit: 'hours', limit: 3 },
        { multiplier: 1, unit: 'days', limit: 6 },
        { multiplier: 1, unit: 'months', limit: 20 },
      ],
    })

    const token = this.generateToken()

    const user = await this.repos.user.findOne({ email })
    if (!user) {
      // User not found
      throw new ServerErrorNotFound({
        ref: ErrorRef.USER_NOT_FOUND,
        userMessage: 'No account with that email address exists',
      })
    }

    await serviceEmail.frequencyLimit({
      to: user.email,
      type: 'password-reset',
      rules: [
        { multiplier: 1, unit: 'hours', limit: 3 },
        { multiplier: 1, unit: 'days', limit: 6 },
        { multiplier: 1, unit: 'months', limit: 20 },
      ],
    })

    let tokens = user.passwordMeta.reset.token || []
    tokens.unshift(token) // push to the beginning of the array
    tokens = tokens.slice(0, 3) // only the keep the latest 3 tokens

    await this.repos.user.updateOne(
      { _id: user._id },
      {
        $set: {
          'passwordMeta.reset.token': tokens,
        },
      },
    )

    const resetParams = new URLSearchParams({
      email: user.email,
      token: token.token,
    })
    const resetUrl = buildAppUrl(
      this.config.model.app,
      'account',
      `password-reset?${resetParams.toString()}`,
    )

    // Send email verify
    await serviceEmail.send({
      type: 'password-reset',
      to: user.email,
      subject: 'Password Reset',
      templateData: {
        user: {
          nameFirst: user.nameFirst,
        },
        token: token.token,
        resetUrl,
      },
    })
  }

  async put({ email, token, password }) {
    const user = await this.repos.user.findOne({ email })

    const maxInvalidTokenAttempts = 3
    const minTokenLength = 4

    if (!user) {
      throw new ServerErrorUnauthorized({
        ref: ErrorRef.USER_NOT_FOUND,
        userMessage: 'No account with that email address exists',
      })
    }

    // Get the verify token that matches the input - if one exists
    const passwordTokens = user.passwordMeta?.reset?.token || []
    const resetToken = passwordTokens
      .concat()
      .filter((resetToken) => {
        return (
          token.length > minTokenLength &&
          timingSafeStringEqual(resetToken.token, token.toLowerCase())
        )
      })
      .shift()

    if (resetToken && resetToken.failCount >= maxInvalidTokenAttempts) {
      // Token is no longer valid
      throw new ServerErrorUnauthorized({
        ref: ErrorRef.TOO_MANY_ATTEMPTS,
        userMessage: 'Email code has expired',
      })
    } else if (resetToken && resetToken.expiresAt < new Date()) {
      // Token is no longer valid
      throw new ServerErrorUnauthorized({
        ref: ErrorRef.EXPIRED,
        userMessage: 'Email code has expired',
      })
    } else if (!token || !resetToken) {
      // Provided token doesn't appear valid or doesn't match
      // - increment failCount
      const resetTokensUpdated = passwordTokens.map((passwordToken) => {
        passwordToken.failCount = passwordToken.failCount + 1
        return passwordToken
      })

      await this.repos.user.updateOne(
        { _id: user._id },
        { $set: { 'passwordMeta.reset.token': resetTokensUpdated } },
      )

      throw new ServerErrorBadRequest({
        ref: ErrorRef.INVALID_TOKEN,
        userMessage: 'Invalid email code',
      })
    } else {
      // Validate password meets requirements
      const passwordValidation = validatePassword(password)
      if (passwordValidation !== true) {
        throw new ServerErrorBadRequest({
          ref: ErrorRef.INVALID_PASSWORD,
          userMessage: passwordValidation,
        })
      }

      const passwordHash = await bcryptjs.hash(
        password,
        this.config.model.app.bcryptSaltRounds,
      )
      // Provided token matches
      // - set password
      await this.repos.user.updateOne(
        { _id: user._id },
        {
          $set: {
            password: passwordHash,
            'passwordMeta.reset.token': [],
          },
        },
      )

      await this.modelManager.services.eventLog.log({
        action: 'user.password.reset',
        userId: String(user._id),
      })
    }
  }
}

export default ServicePassword
