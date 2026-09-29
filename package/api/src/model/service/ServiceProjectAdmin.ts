import { Service, ServerErrorNotFound, ServerErrorForbidden } from '@datacapy/server'
import { ProjectAdmin } from 'veysur-common'
import { RepoProjectAdmin, RepoUser, Email } from 'model/repo'
import { AclContext } from 'model/entity'
import { StringRandom } from 'model/common'
import { SystemEmailTemplateLoader } from 'model/common/EmailTemplateLoader'
import { ServiceUser } from 'model'
import { ServiceEmail } from './ServiceEmail'
import { ServiceProject } from './ServiceProject'
import { ServiceAuthEmailPassword } from './ServiceAuthEmailPassword'
import { buildAppUrl } from 'config/buildAppUrl'

export class ServiceProjectAdmin extends Service {
  constructor() {
    super({ name: 'projectAdmin' })
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim()
  }

  private async assertNotAlreadyMember({
    repoProjectAdmin,
    projectId,
    isOwner,
    existingQuery,
    perspective,
  }: {
    repoProjectAdmin: RepoProjectAdmin
    projectId: string
    isOwner: boolean
    existingQuery: Record<string, unknown>
    perspective: 'inviter' | 'invitee'
  }): Promise<void> {
    if (isOwner) {
      throw new ServerErrorForbidden(
        perspective === 'inviter'
          ? 'This user is already the owner of this project'
          : 'You are already the owner of this project',
      )
    }

    const existingAdmin = await repoProjectAdmin.findOne({
      projectId,
      ...existingQuery,
    })
    if (existingAdmin) {
      throw new ServerErrorForbidden(
        perspective === 'inviter'
          ? 'This user is already a member or has a pending invitation for this project'
          : 'You are already a member of this project',
      )
    }
  }

  async listWithUsers({
    projectId,
    limit,
    skip,
  }: {
    projectId: string
    limit?: number
    skip?: number
  }) {
    const repo = this.getRepo<RepoProjectAdmin>('projectAdmin')
    return repo.find(
      { projectId },
      {
        populate: { user: true, invitedBy: true },
        limit,
        skip,
        sort: { createdAt: 1 },
      },
    )
  }

  async invite({
    projectId,
    nameFirst,
    nameLast,
    email,
    aclContext,
  }: {
    projectId: string
    nameFirst: string
    nameLast?: string
    email: string
    aclContext: AclContext
  }) {
    const repoProjectAdmin = this.getRepo<RepoProjectAdmin>('projectAdmin')
    const repoUser = this.getRepo<RepoUser>('user')
    const serviceEmail = this.getService<ServiceEmail>('email')

    const project =
      await this.getService<ServiceProject>('project').getById(projectId)
    if (!project) {
      throw new ServerErrorNotFound('Project not found')
    }

    const inviter = await repoUser.findOne({ _id: aclContext.jwt._id })
    if (!inviter) {
      throw new ServerErrorNotFound('Inviter not found')
    }

    const normalizedEmail = this.normalizeEmail(email)

    if (normalizedEmail === this.normalizeEmail(inviter.email)) {
      throw new ServerErrorForbidden('You cannot invite yourself')
    }

    const owner = await repoUser.findOne({ _id: project.ownerId })
    await this.assertNotAlreadyMember({
      repoProjectAdmin,
      projectId,
      isOwner: !!owner && normalizedEmail === this.normalizeEmail(owner.email),
      existingQuery: {
        email: normalizedEmail,
        status: { $in: ['active', 'pending'] },
      },
      perspective: 'inviter',
    })

    const code = StringRandom.genAlphaNumericLower(32)

    const invite = new ProjectAdmin({
      projectId,
      userId: null,
      createdById: aclContext.jwt._id,
      status: 'pending',
      email: normalizedEmail,
      nameFirst,
      nameLast: nameLast || null,
      code,
    })

    await repoProjectAdmin.insertOne(invite)

    const inviteParams = new URLSearchParams({ code, email })
    const inviteUrl = buildAppUrl(
      this.config.model.app,
      'account',
      `team-invite/accept?${inviteParams.toString()}`,
    )

    const templateData = {
      inviteeName: nameFirst,
      projectName: project.name,
      inviterName:
        inviter.nameFirst + (inviter.nameLast ? ' ' + inviter.nameLast : ''),
      inviteUrl,
    }

    const systemTemplate = SystemEmailTemplateLoader.getInstance().getTemplate(
      'team-invite',
      'en',
    )

    if (systemTemplate) {
      const subject = this._replacePlaceholders(
        systemTemplate.subject,
        templateData,
      )
      const html = this._replacePlaceholders(systemTemplate.body, templateData)

      const emailRecord: Email = {
        type: 'team-invite',
        to: email,
        subject,
        html,
        templateData,
      }

      await serviceEmail.send(emailRecord)
    }

    return invite
  }

  async remove({
    projectId,
    projectAdminId,
    aclContext: _aclContext,
  }: {
    projectId: string
    projectAdminId: string
    aclContext: AclContext
  }) {
    const repo = this.getRepo<RepoProjectAdmin>('projectAdmin')
    const record = await repo.findOne({ _id: projectAdminId, projectId })
    if (!record) {
      throw new ServerErrorNotFound('Team member not found')
    }
    await repo.deleteOne({ _id: projectAdminId, projectId })
    return { success: true }
  }

  async getInviteDetail({
    code,
    email,
    aclContext,
  }: {
    code: string
    email: string
    aclContext: AclContext
  }) {
    const repo = this.getRepo<RepoProjectAdmin>('projectAdmin')

    const invite = await repo.findOne(
      { code, status: 'pending' },
      { populate: { invitedBy: true } },
    )

    if (!invite) {
      throw new ServerErrorNotFound('Invitation not found')
    }

    if (invite.email !== email) {
      throw new ServerErrorForbidden(
        'This invitation is not for your email address',
      )
    }

    if (aclContext?.jwt?.email && aclContext.jwt.email !== email) {
      throw new ServerErrorForbidden('This invitation is not for your account')
    }

    invite.project = await this.getService<ServiceProject>('project').getById(
      invite.projectId,
    )

    return invite
  }

  async accept({
    code,
    email,
    aclContext,
  }: {
    code: string
    email: string
    aclContext: AclContext
  }) {
    const repo = this.getRepo<RepoProjectAdmin>('projectAdmin')
    const repoUser = this.getRepo<RepoUser>('user')

    const invite = await repo.findOne({ code, status: 'pending' })
    if (!invite) {
      throw new ServerErrorNotFound('Invitation not found')
    }

    if (invite.email !== email) {
      throw new ServerErrorForbidden(
        'This invitation is not for your email address',
      )
    }

    const user = await repoUser.findOne({ _id: aclContext.jwt._id })
    if (!user) {
      throw new ServerErrorNotFound('User not found')
    }

    if (user.email !== email) {
      throw new ServerErrorForbidden('This invitation is not for your account')
    }

    const project = await this.getService<ServiceProject>('project').getById(
      invite.projectId,
    )
    if (!project) {
      throw new ServerErrorNotFound('Project not found')
    }

    await this.assertNotAlreadyMember({
      repoProjectAdmin: repo,
      projectId: invite.projectId,
      isOwner: project.ownerId === user._id,
      existingQuery: { userId: user._id, status: 'active' },
      perspective: 'invitee',
    })

    await repo.updateOne(
      { _id: invite._id },
      {
        $set: {
          userId: aclContext.jwt._id,
          status: 'active',
          code: null,
          updatedAt: new Date(),
        },
      },
    )

    return { projectId: invite.projectId }
  }

  /**
   * Accepts an invite for an invitee with no existing account, creating one
   * as part of acceptance. Unlike `accept()`, this is reachable
   * unauthenticated - the invite `code` plus matching `email` is the
   * authorization proof (same trust model as the emailed invite link
   * itself). Reuses `ServiceUser.createAccount()`, the same account-creation
   * primitive the self-hosted CLI bootstrap tool uses, rather than
   * reimplementing it.
   */
  async acceptNewAccount({
    code,
    email,
    nameFirst,
    nameLast,
    password,
    ip,
    userAgent,
    deviceId,
    deviceName,
    deviceSystem,
    deviceSystemVersion,
    buildVersion,
    buildNumber,
    jwtConfig,
  }: {
    code: string
    email: string
    nameFirst: string
    nameLast?: string
    password: string
    ip?: string
    userAgent?: string
    deviceId?: string
    deviceName?: string
    deviceSystem?: string
    deviceSystemVersion?: string
    buildVersion?: string
    buildNumber?: string
    jwtConfig?: unknown
  }) {
    const repo = this.getRepo<RepoProjectAdmin>('projectAdmin')

    const invite = await repo.findOne({ code, status: 'pending' })
    if (!invite) {
      throw new ServerErrorNotFound('Invitation not found')
    }

    if (invite.email !== email) {
      throw new ServerErrorForbidden(
        'This invitation is not for your email address',
      )
    }

    const { userId } = await this.getService<ServiceUser>('user').createAccount(
      { nameFirst, nameLast, email, password },
    )

    await repo.updateOne(
      { _id: invite._id },
      {
        $set: {
          userId,
          status: 'active',
          code: null,
          updatedAt: new Date(),
        },
      },
    )

    const loginResult = await this.getService<ServiceAuthEmailPassword>(
      'authEmailPassword',
    ).login({
      email,
      password,
      ip,
      userAgent,
      deviceId,
      deviceName,
      deviceSystem,
      deviceSystemVersion,
      buildVersion,
      buildNumber,
      jwtConfig,
    })

    return { ...loginResult, projectId: invite.projectId }
  }

  async decline({
    code,
    email,
    aclContext,
  }: {
    code: string
    email: string
    aclContext: AclContext
  }) {
    const repo = this.getRepo<RepoProjectAdmin>('projectAdmin')
    const repoUser = this.getRepo<RepoUser>('user')

    const invite = await repo.findOne({ code, status: 'pending' })
    if (!invite) {
      throw new ServerErrorNotFound('Invitation not found')
    }

    if (invite.email !== email) {
      throw new ServerErrorForbidden(
        'This invitation is not for your email address',
      )
    }

    const user = await repoUser.findOne({ _id: aclContext.jwt._id })
    if (!user) {
      throw new ServerErrorNotFound('User not found')
    }

    if (user.email !== email) {
      throw new ServerErrorForbidden('This invitation is not for your account')
    }

    await repo.updateOne(
      { _id: invite._id },
      { $set: { status: 'declined', updatedAt: new Date() } },
    )

    return { success: true }
  }

  private _replacePlaceholders(
    template: string,
    data: Record<string, unknown>,
  ): string {
    if (!template) return template
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(data, key)
        ? String(data[key])
        : match
    })
  }
}

export default ServiceProjectAdmin
