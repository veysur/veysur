import { ServerErrorForbidden, ServerErrorNotFound } from 'mzen-server'
import { ServiceProjectAdmin } from './ServiceProjectAdmin'
import { AclContext } from 'model/entity'
import { asPrivate } from 'test-utils/asPrivate'

describe('ServiceProjectAdmin', () => {
  let service: ServiceProjectAdmin
  let mockRepoProjectAdmin: {
    findOne: jest.Mock
    insertOne: jest.Mock
    updateOne: jest.Mock
  }
  let mockServiceProject: { getById: jest.Mock }
  let mockRepoUser: { findOne: jest.Mock }
  let mockServiceEmail: { send: jest.Mock }
  let mockServiceUser: { createAccount: jest.Mock }
  let mockServiceAuthEmailPassword: { login: jest.Mock }

  const projectId = 'project-1'
  const ownerId = 'owner-1'
  const inviterId = 'inviter-1'
  const inviterEmail = 'inviter@example.com'

  const aclContext = {
    jwt: { _id: inviterId, email: inviterEmail },
  } as AclContext

  beforeEach(() => {
    service = new ServiceProjectAdmin()
    asPrivate<
      ServiceProjectAdmin,
      {
        config: {
          model: { app: { accountDomain: string; accountBasePath: string } }
        }
      }
    >(service).config = {
      model: {
        app: { accountDomain: 'account.veysur.test', accountBasePath: '' },
      },
    }

    mockRepoProjectAdmin = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue(undefined),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    mockServiceProject = {
      getById: jest
        .fn()
        .mockResolvedValue({ _id: projectId, ownerId, name: 'Test Project' }),
    }
    mockRepoUser = {
      findOne: jest.fn().mockImplementation(({ _id }: { _id: string }) => {
        if (_id === inviterId)
          return Promise.resolve({
            _id: inviterId,
            email: inviterEmail,
            nameFirst: 'Inviter',
          })
        if (_id === ownerId)
          return Promise.resolve({
            _id: ownerId,
            email: 'owner@example.com',
            nameFirst: 'Owner',
          })
        return Promise.resolve(null)
      }),
    }
    mockServiceEmail = { send: jest.fn().mockResolvedValue(undefined) }
    mockServiceUser = {
      createAccount: jest.fn().mockResolvedValue({
        userId: 'new-user-1',
        email: 'newmember@example.com',
      }),
    }
    mockServiceAuthEmailPassword = {
      login: jest.fn().mockResolvedValue({ jwt: { token: 'signed' } }),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        projectAdmin: mockRepoProjectAdmin,
        user: mockRepoUser,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        email: mockServiceEmail,
        project: mockServiceProject,
        user: mockServiceUser,
        authEmailPassword: mockServiceAuthEmailPassword,
      }
      return map[name] ?? {}
    }) as typeof service.getService)
  })

  describe('invite', () => {
    const inviteArgs = (email: string) => ({
      projectId,
      nameFirst: 'Test',
      email,
      aclContext,
    })

    it('rejects a self-invite by the inviter', async () => {
      await expect(
        service.invite(inviteArgs(inviterEmail)),
      ).rejects.toMatchObject({
        constructor: ServerErrorForbidden,
        message: 'You cannot invite yourself',
      })
      expect(mockRepoProjectAdmin.insertOne).not.toHaveBeenCalled()
    })

    it('rejects a self-invite with different email casing/whitespace', async () => {
      await expect(
        service.invite(inviteArgs('  Inviter@Example.com  ')),
      ).rejects.toMatchObject({
        constructor: ServerErrorForbidden,
        message: 'You cannot invite yourself',
      })
      expect(mockRepoProjectAdmin.insertOne).not.toHaveBeenCalled()
    })

    it('rejects inviting the project owner', async () => {
      await expect(
        service.invite(inviteArgs('owner@example.com')),
      ).rejects.toMatchObject({
        constructor: ServerErrorForbidden,
        message: 'This user is already the owner of this project',
      })
      expect(mockRepoProjectAdmin.insertOne).not.toHaveBeenCalled()
    })

    it('rejects inviting an email with an existing active or pending admin record', async () => {
      mockRepoProjectAdmin.findOne.mockResolvedValueOnce({
        _id: 'existing-admin',
        projectId,
        email: 'member@example.com',
        status: 'active',
      })

      await expect(
        service.invite(inviteArgs('member@example.com')),
      ).rejects.toMatchObject({
        constructor: ServerErrorForbidden,
        message:
          'This user is already a member or has a pending invitation for this project',
      })
      expect(mockRepoProjectAdmin.insertOne).not.toHaveBeenCalled()
    })

    it('allows inviting a genuinely new email', async () => {
      const invite = await service.invite(inviteArgs('newmember@example.com'))
      expect(invite.email).toBe('newmember@example.com')
      expect(mockRepoProjectAdmin.insertOne).toHaveBeenCalled()
      expect(mockServiceEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            inviteUrl: expect.stringMatching(
              /^https:\/\/account\.veysur\.test\/team-invite\/accept\?/,
            ),
          }),
        }),
      )
    })

    it('builds a path-prefixed invite URL under a self-hosted (single-domain) config', async () => {
      asPrivate<
        ServiceProjectAdmin,
        {
          config: {
            model: { app: { accountDomain: string; accountBasePath: string } }
          }
        }
      >(service).config = {
        model: {
          app: { accountDomain: 'veysur.local', accountBasePath: '/account' },
        },
      }

      await service.invite(inviteArgs('newmember@example.com'))

      expect(mockServiceEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            inviteUrl: expect.stringMatching(
              /^https:\/\/veysur\.local\/account\/team-invite\/accept\?/,
            ),
          }),
        }),
      )
    })
  })

  describe('accept', () => {
    const acceptingUserId = 'accepting-user-1'
    const acceptingUserEmail = 'accepting@example.com'
    const acceptAclContext = {
      jwt: { _id: acceptingUserId, email: acceptingUserEmail },
    } as AclContext

    beforeEach(() => {
      mockRepoUser.findOne.mockImplementation(({ _id }: { _id: string }) => {
        if (_id === acceptingUserId) {
          return Promise.resolve({
            _id: acceptingUserId,
            email: acceptingUserEmail,
          })
        }
        return Promise.resolve(null)
      })
    })

    const pendingInvite = {
      _id: 'invite-1',
      code: 'abc123',
      projectId,
      email: acceptingUserEmail,
      status: 'pending',
    }

    it('rejects acceptance when the user already owns the project', async () => {
      mockRepoProjectAdmin.findOne.mockResolvedValueOnce(pendingInvite)
      mockServiceProject.getById.mockResolvedValueOnce({
        _id: projectId,
        ownerId: acceptingUserId,
      })

      await expect(
        service.accept({
          code: 'abc123',
          email: acceptingUserEmail,
          aclContext: acceptAclContext,
        }),
      ).rejects.toMatchObject({
        constructor: ServerErrorForbidden,
        message: 'You are already the owner of this project',
      })
      expect(mockRepoProjectAdmin.updateOne).not.toHaveBeenCalled()
    })

    it('rejects acceptance when the user is already an active member', async () => {
      mockRepoProjectAdmin.findOne
        .mockResolvedValueOnce(pendingInvite)
        .mockResolvedValueOnce({
          _id: 'existing-admin',
          projectId,
          userId: acceptingUserId,
          status: 'active',
        })

      await expect(
        service.accept({
          code: 'abc123',
          email: acceptingUserEmail,
          aclContext: acceptAclContext,
        }),
      ).rejects.toMatchObject({
        constructor: ServerErrorForbidden,
        message: 'You are already a member of this project',
      })
      expect(mockRepoProjectAdmin.updateOne).not.toHaveBeenCalled()
    })

    it('rejects acceptance when the project no longer exists', async () => {
      mockRepoProjectAdmin.findOne.mockResolvedValueOnce(pendingInvite)
      mockServiceProject.getById.mockResolvedValueOnce(null)

      await expect(
        service.accept({
          code: 'abc123',
          email: acceptingUserEmail,
          aclContext: acceptAclContext,
        }),
      ).rejects.toMatchObject({
        constructor: ServerErrorNotFound,
        message: 'Project not found',
      })
    })

    it('accepts a valid invite for a genuinely new member', async () => {
      mockRepoProjectAdmin.findOne
        .mockResolvedValueOnce(pendingInvite)
        .mockResolvedValueOnce(null)

      const result = await service.accept({
        code: 'abc123',
        email: acceptingUserEmail,
        aclContext: acceptAclContext,
      })

      expect(result).toEqual({ projectId })
      expect(mockRepoProjectAdmin.updateOne).toHaveBeenCalledWith(
        { _id: 'invite-1' },
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'active' }),
        }),
      )
    })
  })

  describe('acceptNewAccount', () => {
    const newMemberEmail = 'newmember@example.com'

    const pendingInvite = {
      _id: 'invite-2',
      code: 'code-2',
      projectId,
      email: newMemberEmail,
      status: 'pending',
    }

    const acceptArgs = (overrides: Record<string, unknown> = {}) => ({
      code: 'code-2',
      email: newMemberEmail,
      nameFirst: 'New',
      nameLast: 'Member',
      password: 'A-valid-password-1',
      ...overrides,
    })

    it('rejects when the invite code is not found', async () => {
      mockRepoProjectAdmin.findOne.mockResolvedValueOnce(null)

      await expect(
        service.acceptNewAccount(acceptArgs()),
      ).rejects.toMatchObject({
        constructor: ServerErrorNotFound,
        message: 'Invitation not found',
      })
      expect(mockServiceUser.createAccount).not.toHaveBeenCalled()
    })

    it('rejects when the email does not match the invite', async () => {
      mockRepoProjectAdmin.findOne.mockResolvedValueOnce(pendingInvite)

      await expect(
        service.acceptNewAccount(
          acceptArgs({ email: 'someone-else@example.com' }),
        ),
      ).rejects.toMatchObject({
        constructor: ServerErrorForbidden,
        message: 'This invitation is not for your email address',
      })
      expect(mockServiceUser.createAccount).not.toHaveBeenCalled()
    })

    it('rejects when an account already exists for the invited email', async () => {
      mockRepoProjectAdmin.findOne.mockResolvedValueOnce(pendingInvite)
      mockServiceUser.createAccount.mockRejectedValueOnce(
        new ServerErrorForbidden(
          `User with email "${newMemberEmail}" already exists`,
        ),
      )

      await expect(
        service.acceptNewAccount(acceptArgs()),
      ).rejects.toMatchObject({ constructor: ServerErrorForbidden })
      expect(mockRepoProjectAdmin.updateOne).not.toHaveBeenCalled()
    })

    it('creates the account, activates the invite, and logs the user in', async () => {
      mockRepoProjectAdmin.findOne.mockResolvedValueOnce(pendingInvite)

      const result = await service.acceptNewAccount(acceptArgs())

      expect(mockServiceUser.createAccount).toHaveBeenCalledWith({
        nameFirst: 'New',
        nameLast: 'Member',
        email: newMemberEmail,
        password: 'A-valid-password-1',
      })
      expect(mockRepoProjectAdmin.updateOne).toHaveBeenCalledWith(
        { _id: 'invite-2' },
        expect.objectContaining({
          $set: expect.objectContaining({
            userId: 'new-user-1',
            status: 'active',
            code: null,
          }),
        }),
      )
      expect(mockServiceAuthEmailPassword.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: newMemberEmail,
          password: 'A-valid-password-1',
        }),
      )
      expect(result).toEqual(
        expect.objectContaining({
          jwt: { token: 'signed' },
          projectId,
        }),
      )
    })
  })
})
