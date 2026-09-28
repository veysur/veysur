import {
  Service,
  ServerErrorBadRequest,
  ServerErrorForbidden,
  ServerErrorNotFound,
} from 'mzen-server'
import momentTimezone from 'moment-timezone'
import * as bcryptjs from 'bcryptjs'
import {
  StringRandom,
  USER_ROLE_CUSTOMER,
  UserEmailMeta,
  validatePassword,
} from 'veysur-common'
import {
  RepoUser,
  ServiceEmail,
  ServiceProject,
  ServiceVerifyEmail,
  User,
} from 'model'
import { ServiceEmailDomainCheck } from './ServiceEmailDomainCheck'

const ACCOUNT_DELETION_RETENTION = 'P1M'

/**
 * What an extension adds to a profile update: extra fields for the same `$set`
 * as core's own, and the audit event actions to log once that write succeeds.
 */
export interface ProfileExtension {
  update: Record<string, unknown>
  eventActions: string[]
}
const ERROR_DISPOSABLE_EMAIL_DOMAIN = 'ERROR_DISPOSABLE_EMAIL_DOMAIN'

export class ServiceUser extends Service {
  constructor() {
    super({
      name: 'user',
    })
  }

  async me({ aclContext }) {
    return this.getForClient({ _id: aclContext.jwt._id })
  }

  async getForClient(query) {
    return this.getRepo<RepoUser>('user').findOne(
      { ...query },
      {
        includeDeleted: true,
        filterPrivate: true,
        populate: {
          client: true,
          projectAdmin: true,
          'projectAdmin.*.project': true,
        },
      },
    )
  }

  async putProfile({
    data,
    aclContext,
  }: {
    data: Partial<User> & { passwordCurrent: string }
    aclContext: {
      jwt?: { _id: string }
      clientId?: string
      accessToken?: { isNew(): boolean }
    }
  }) {
    const updateData: Partial<User> = {}
    // eslint-disable-next-line no-useless-assignment -- kept pending the TODO below to re-enable the recent-auth check
    let requireRecentAuth = false
    let sendEmailVerifyToken = false

    const repoUser = this.getRepo<RepoUser>('user')

    let user = await repoUser.findOne(
      { _id: aclContext.jwt._id },
      { includeDeleted: true },
    )

    if (data.nameFirst) updateData.nameFirst = data.nameFirst
    if (data.nameLast) updateData.nameLast = data.nameLast
    const extension = await this.prepareProfileExtension({ data, user })
    Object.assign(updateData, extension.update)
    if (data.email && data.email != user.email) {
      // eslint-disable-next-line no-useless-assignment -- kept pending the TODO below to re-enable the recent-auth check
      requireRecentAuth = true
      updateData.email = data.email

      if (
        await this.getService<ServiceEmailDomainCheck>(
          'emailDomainCheck',
        ).isDisposableEmailDomain(data.email)
      ) {
        throw new ServerErrorBadRequest({
          ref: ERROR_DISPOSABLE_EMAIL_DOMAIN,
          key: 'error.disposableEmailDomain',
          userMessage: 'Please use a permanent email address',
        })
      }

      // Ensure user with given email does not already exist
      const existingUser = await repoUser.findOne({ email: data.email })
      if (existingUser) {
        // User already exists
        throw new ServerErrorForbidden(
          'User with email "' + data.email + '" already exists',
        )
      }
      if (user.email) {
        // User previously has an email set

        // - lets record the change history
        let history = user.emailMeta.history ? user.emailMeta.history : []
        history.unshift({
          prevValue: user.email,
          verifyStatus: user.emailMeta.verify.status,
          clientId: aclContext.clientId,
          createdAt: new Date(),
        })
        // Limit we amount of history we keep
        history = history.slice(0, 20)
        updateData['emailMeta.history'] = history

        // If the new email address was previously verified
        // - set verification status
        // - otherwise reset verification status
        const previouslyVerified = history
          .filter((aHistory) => {
            return (
              aHistory.prevValue == data.email &&
              aHistory.verifyStatus.isVerified
            )
          })
          .shift()
        if (previouslyVerified) {
          updateData['emailMeta.verify.status'] =
            previouslyVerified.verifyStatus
        } else {
          updateData['emailMeta.verify.token'] = []
          updateData['emailMeta.verify.status'] = {
            isVerified: false,
            isVerifiedAt: null,
          }
          sendEmailVerifyToken = true
        }
      } else {
        updateData['emailMeta.verify.token'] = []
        updateData['emailMeta.verify.status'] = {
          isVerified: false,
          isVerifiedAt: null,
        }
      }
    }
    if (data.password) {
      if (user.password) {
        const passwordCurrentMatched = await bcryptjs.compare(
          data.passwordCurrent,
          user.password,
        )
        if (!passwordCurrentMatched)
          throw new ServerErrorBadRequest('Existing password does not match')
      } else {
        // User did not already have a password so recent auth is required
        // eslint-disable-next-line no-useless-assignment -- kept pending the TODO below to re-enable the recent-auth check
        requireRecentAuth = true
      }

      // Validate password meets requirements
      const passwordValidation = validatePassword(data.password)
      if (passwordValidation !== true) {
        throw new ServerErrorBadRequest(passwordValidation)
      }

      // encrypt password
      updateData.password = await bcryptjs.hash(
        data.password,
        this.config.model.app.bcryptSaltRounds,
      )
    }

    // TODO: need to retrieve the accessToken even though we authed via JWT
    requireRecentAuth = false // temp disable
    if (requireRecentAuth) {
      if (!aclContext.accessToken || !aclContext.accessToken.isNew()) {
        throw new ServerErrorBadRequest(
          'This request requires recent authorisation',
        )
      }
    }

    if (Object.keys(updateData).length) {
      const validationResult = await repoUser.schema?.validatePaths(updateData)
      if (validationResult && !validationResult.isValid) {
        throw new ServerErrorBadRequest(validationResult.errors)
      }
      await repoUser.updateOne({ _id: user._id }, { $set: updateData })

      const userId = String(user._id)
      if (updateData.email) {
        await this.modelManager.services.eventLog.log({
          action: 'user.email.updated',
          userId,
          metadata: { email: updateData.email },
        })
      }
      if (updateData.nameFirst || updateData.nameLast) {
        await this.modelManager.services.eventLog.log({
          action: 'user.name.updated',
          userId,
          metadata: {
            nameFirst: updateData.nameFirst,
            nameLast: updateData.nameLast,
          },
        })
      }
      if (updateData.password) {
        await this.modelManager.services.eventLog.log({
          action: 'user.password.updated',
          userId,
        })
      }
      for (const action of extension.eventActions) {
        await this.modelManager.services.eventLog.log({ action, userId })
      }
    }

    user = await this.getForClient({ _id: user._id })

    if (sendEmailVerifyToken) {
      await this.getService<ServiceVerifyEmail>('verifyEmail').sendForUser(user)
      user = await this.getForClient({ _id: user._id })
    }

    return user
  }

  /**
   * Extension point for profile fields an extension adds. Called after core has
   * read its own fields from `data` and before validation and the write, so an
   * extension can validate, and reject, against the stored `user`. Core has none.
   */
  protected async prepareProfileExtension(_args: {
    data: Partial<User>
    user: User
  }): Promise<ProfileExtension> {
    return { update: {}, eventActions: [] }
  }

  /**
   * Extension point for stored fields an extension must scrub, alongside core's,
   * when a soft-deleted user is anonymised. Core has none.
   */
  protected getAnonymisedExtensionFields(): Record<string, null> {
    return {}
  }

  async validatePasswordCurrent({ value, aclContext }) {
    const repoUser = this.getRepo<RepoUser>('user')
    const user = await repoUser.findOne(
      { _id: aclContext.jwt._id },
      { includeDeleted: true },
    )
    // The user already has a password so they must provide this password in order to change it
    let passwordsMatch = false
    if (value && user.password) {
      passwordsMatch = await bcryptjs.compare(value, user.password)
    }
    return passwordsMatch ? true : 'Incorrect password'
  }
  async validateEmailNotRegistered({ value, aclContext }) {
    const repoUser = this.getRepo<RepoUser>('user')
    const existingUser = await repoUser.findOne({
      email: value.trim(),
    })
    return !existingUser ||
      (aclContext.jwt &&
        existingUser._id &&
        aclContext.jwt._id &&
        String(existingUser._id) == String(aclContext.jwt._id))
      ? true
      : 'This email address is already registered to another user'
  }

  /**
   * Send a reminder email ~reminderBeforeDays before a soft-deleted account
   * is permanently anonymised, prompting the user to log back in to restore.
   */
  async sendDeletionReminders(
    options: { reminderBeforeDays?: number } = {},
  ): Promise<{ sent: number }> {
    const { reminderBeforeDays = 7 } = options
    const purgeCutoff = momentTimezone()
      .add(reminderBeforeDays, 'days')
      .subtract(momentTimezone.duration(ACCOUNT_DELETION_RETENTION))
      .toDate()

    const repoUser = this.getRepo<RepoUser>('user')
    const dueUsers = await repoUser.find(
      {
        deletedAt: { $ne: null, $lte: purgeCutoff },
        anonymizedAt: null,
        deletionReminderSentAt: null,
      },
      { includeDeleted: true },
    )

    let sent = 0
    for (const user of dueUsers) {
      try {
        await repoUser.updateOne(
          { _id: user._id },
          { $set: { deletionReminderSentAt: new Date() } },
          { includeDeleted: true },
        )

        await this.getService<ServiceEmail>('email').send({
          type: 'account-deletion-reminder',
          to: user.email,
          subject: 'Your account will be permanently deleted soon',
          templateData: {
            user: { nameFirst: user.nameFirst },
          },
        })
        sent++
      } catch (err) {
        this.logger.log(
          `[ServiceUser] Failed to send deletion reminder for user ${user._id}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    this.logger.log(
      `[ServiceUser] sendDeletionReminders complete: sent ${sent} of ${dueUsers.length} due reminders`,
    )
    return { sent }
  }

  /**
   * Anonymise soft-deleted users past the P1M cutoff. The row is never
   * removed - RepoPayment and other accounting records reference userId
   * independently of this row, and anonymising in place (rather than hard
   * deleting) keeps those references valid for as long as accounting/tax
   * retention requires. Any still soft-deleted owned projects are left
   * untouched - projects purge independently via ServiceProject.hardDeleteAll.
   */
  async anonymizeAll(
    options: { olderThan?: string } = {},
  ): Promise<{ anonymized: number }> {
    const { olderThan = ACCOUNT_DELETION_RETENTION } = options
    const cutoffDate = momentTimezone()
      .subtract(momentTimezone.duration(olderThan))
      .toDate()

    const repoUser = this.getRepo<RepoUser>('user')
    const dueUsers = await repoUser.find(
      { deletedAt: { $ne: null, $lt: cutoffDate }, anonymizedAt: null },
      { includeDeleted: true },
    )

    let anonymized = 0
    for (const user of dueUsers) {
      try {
        await repoUser.updateOne(
          { _id: user._id },
          {
            $set: {
              email: `deleted-${user._id}@deleted.invalid`,
              nameFirst: 'Deleted',
              nameLast: 'User',
              ...this.getAnonymisedExtensionFields(),
              password: null,
              twoFactorSecret: null,
              twoFactorMeta: {
                enabled: false,
                enabledAt: null,
                prompt: { dismissed: true },
              },
              anonymizedAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { includeDeleted: true },
        )

        await this.modelManager.services.eventLog.log({
          action: 'user.anonymized',
          userId: String(user._id),
        })
        anonymized++
      } catch (err) {
        this.logger.log(
          `[ServiceUser] Failed to anonymize user ${user._id}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    this.logger.log(
      `[ServiceUser] anonymizeAll complete: anonymized ${anonymized} of ${dueUsers.length} soft-deleted users`,
    )
    return { anonymized }
  }

  /**
   * Operator-invoked account bootstrap - creates a fully-usable user,
   * bypassing the public signup HTTP flow entirely. Used to get the first
   * login into a fresh install (self-hosted first run, or a quick local dev
   * account) via the generic task-runner dispatch (API_TASK=user
   * API_ACTION=createAccount), never exposed over HTTP. See
   * docs/admin-account-bootstrap.md.
   *
   * Unlike public signup, the email is pre-verified. This does NOT make the
   * created user a project owner - self-hosted's single project is a
   * static, config-sourced value (see `model/service/ServiceProject.ts`), so
   * the operator must additionally set `API_PROJECT_OWNER_ID=<userId>` (and
   * restart the API pod) before this user can act as project owner. Until
   * that happens, the user can log in and use `authedAdmin`-gated features
   * (e.g. edit surveys) but any `projectOwner`-gated action 403s.
   */
  async createAccount(
    options: {
      nameFirst?: string
      nameLast?: string
      email: string
      password?: string
    } = { email: undefined },
  ): Promise<{
    userId: string
    email: string
    password?: string
  }> {
    const { nameFirst = 'Admin', nameLast = 'User', email } = options

    if (!email) {
      throw new ServerErrorBadRequest('email is required')
    }

    const repoUser = this.getRepo<RepoUser>('user')

    const existing = await repoUser.findOne({ email })
    if (existing) {
      throw new ServerErrorForbidden(
        'User with email "' + email + '" already exists',
      )
    }

    const generatedPassword = options.password
      ? undefined
      : this.generatePassword()
    const password = options.password ?? generatedPassword

    const passwordValidation = validatePassword(password)
    if (passwordValidation !== true) {
      throw new ServerErrorBadRequest(passwordValidation)
    }

    const now = new Date()
    const passwordHash = await bcryptjs.hash(
      password,
      this.config.model.app.bcryptSaltRounds,
    )
    const emailMeta = new UserEmailMeta({
      verify: { status: { isVerified: true, isVerifiedAt: now }, token: [] },
    })

    const user = new User({
      nameFirst,
      nameLast,
      email,
      password: passwordHash,
      emailMeta,
      role: USER_ROLE_CUSTOMER,
      createdAt: now,
    })
    await repoUser.insertOne(user)

    await this.modelManager.services.eventLog.log({
      action: 'user.accountBootstrapped',
      userId: String(user._id),
    })

    return {
      userId: String(user._id),
      email,
      ...(generatedPassword ? { password: generatedPassword } : {}),
    }
  }

  /**
   * Generates a password guaranteed to pass validatePassword. StringRandom's
   * alphanumeric generator has no minimum-digit guarantee (a run of all
   * letters is legal, just unlikely) and no special-character mode at all,
   * so both are appended explicitly rather than left to chance, then the
   * result is shuffled so they don't always land in the same position.
   */
  private generatePassword(): string {
    const base = StringRandom.genAlphaNumeric(10)
    const digit = StringRandom.genNumeric(1)
    const special = '!@#$%^&*'[Math.floor(Math.random() * 8)]
    return (base + digit + special)
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('')
  }

  /**
   * Lists every user with the project(s) they own, for operator use
   * (API_TASK=user API_ACTION=listAccounts) - see
   * docs/admin-account-bootstrap.md.
   */
  async listAccounts(): Promise<
    Array<{
      userId: string
      email: string
      nameFirst: string
      nameLast: string
      createdAt: Date
      projects: Array<{
        projectId: string
        name: string
      }>
    }>
  > {
    const repoUser = this.getRepo<RepoUser>('user')
    const users = await repoUser.find({})
    const projectService = this.getService<ServiceProject>('project')
    await Promise.all(users.map((user) => projectService.attachOwnership(user)))

    return users.map((user) => ({
      userId: String(user._id),
      email: user.email,
      nameFirst: user.nameFirst,
      nameLast: user.nameLast,
      createdAt: user.createdAt,
      projects: (user.projectOwn ?? []).map((ownedProject) => ({
        projectId: String(ownedProject._id),
        name: ownedProject.name,
      })),
    }))
  }

  /**
   * Operator-invoked password reset by email, bypassing the token-gated
   * ServicePassword flow entirely (an operator with infrastructure-level
   * access has no code to prove, unlike the emailed-token reset). See
   * docs/admin-account-bootstrap.md.
   */
  async resetPassword(options: {
    email: string
    password?: string
  }): Promise<{ userId: string; email: string; password?: string }> {
    const { email } = options
    const repoUser = this.getRepo<RepoUser>('user')

    const user = await repoUser.findOne({ email })
    if (!user) {
      throw new ServerErrorNotFound('No account with that email address exists')
    }

    const generatedPassword = options.password
      ? undefined
      : this.generatePassword()
    const password = options.password ?? generatedPassword

    const passwordValidation = validatePassword(password)
    if (passwordValidation !== true) {
      throw new ServerErrorBadRequest(passwordValidation)
    }

    const passwordHash = await bcryptjs.hash(
      password,
      this.config.model.app.bcryptSaltRounds,
    )
    await repoUser.updateOne(
      { _id: user._id },
      { $set: { password: passwordHash, updatedAt: new Date() } },
    )

    await this.modelManager.services.eventLog.log({
      action: 'user.password.updated',
      userId: String(user._id),
    })

    return {
      userId: String(user._id),
      email,
      ...(generatedPassword ? { password: generatedPassword } : {}),
    }
  }
}

export default ServiceUser
