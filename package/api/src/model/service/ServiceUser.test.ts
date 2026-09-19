// cspell:ignore Musterstr Musterfirma SARL
import { ServerErrorBadRequest } from 'mzen-server'
import { ServiceUser } from './ServiceUser'
import { asPrivate } from 'test-utils/asPrivate'

// Mocked, not real, per this file's/ServicePassword.test.ts's existing
// convention — bcryptjs's real async hashing hangs indefinitely under this
// package's `fakeTimers.enableGlobally` jest config (it caches a reference to
// `setImmediate` at module-load time, before any per-test jest.useRealTimers()
// call can take effect).
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}))

type PrivateOverrides = {
  getRepo: (name: string) => unknown
  getService: (name: string) => unknown
  modelManager: { services: { eventLog: { log: jest.Mock } } }
}

function makeService(overrides: {
  repoUser: Record<string, jest.Mock>
  services?: Record<string, unknown>
}) {
  const service = new ServiceUser()
  const withPrivates = asPrivate<ServiceUser, PrivateOverrides>(service)

  const mockEventLog = { log: jest.fn().mockResolvedValue(undefined) }

  withPrivates.getRepo = ((name: string) =>
    ({ user: overrides.repoUser })[name]) as PrivateOverrides['getRepo']
  withPrivates.getService = ((name: string) =>
    (overrides.services ?? {})[name]) as PrivateOverrides['getService']
  withPrivates.modelManager = { services: { eventLog: mockEventLog } }

  service.logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as typeof service.logger
  service.config = {
    model: {
      app: {
        accountDomain: 'account.veysur.com',
        webDomain: 'veysur.com',
        passwordResetTokenTtlSeconds: 3600,
        bcryptSaltRounds: 4,
      },
    },
  }

  return { service, mockEventLog }
}

describe('ServiceUser.anonymizeAll()', () => {
  it('scrubs PII in place and leaves the row intact', async () => {
    const dueUser = {
      _id: 'user_old',
      email: 'old@example.com',
      deletedAt: new Date('2020-01-01'),
    }
    const repoUser = {
      find: jest.fn().mockResolvedValue([dueUser]),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    const { service, mockEventLog } = makeService({ repoUser })

    const result = await service.anonymizeAll({ olderThan: 'P1M' })

    expect(repoUser.find).toHaveBeenCalledWith(
      { deletedAt: { $ne: null, $lt: expect.any(Date) }, anonymizedAt: null },
      { includeDeleted: true },
    )
    expect(repoUser.updateOne).toHaveBeenCalledWith(
      { _id: 'user_old' },
      {
        $set: expect.objectContaining({
          email: 'deleted-user_old@deleted.invalid',
          anonymizedAt: expect.any(Date),
        }),
      },
      { includeDeleted: true },
    )
    expect(mockEventLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.anonymized' }),
    )
    expect(result).toEqual({ anonymized: 1 })
  })
})

describe('ServiceUser.putProfile() — VAT country matching', () => {
  const aclContext = { jwt: { _id: 'user_1' } }

  function setup(userOverrides: Record<string, unknown> = {}) {
    const user = {
      _id: 'user_1',
      email: 'a@example.com',
      billingAddress: { country: 'DE', line1: '1 Musterstr' },
      taxId: 'DE123456789',
      businessName: 'Musterfirma GmbH',
      ...userOverrides,
    }
    const repoUser = {
      findOne: jest.fn().mockResolvedValue(user),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    const mockVat = {
      assertVatCountryMatchesBilling: jest.fn(),
    }

    const { service, mockEventLog } = makeService({
      repoUser,
      services: { vat: mockVat },
    })

    return { service, repoUser, mockVat, mockEventLog, user }
  }

  it('updating only taxId validates it against the already-stored billing country', async () => {
    const { service, mockVat } = setup()

    await service.putProfile({
      data: { taxId: 'FR123456789', passwordCurrent: '' },
      aclContext,
    })

    expect(mockVat.assertVatCountryMatchesBilling).toHaveBeenCalledWith(
      'FR123456789',
      'DE',
    )
  })

  it('updating only billingAddress validates it against the already-stored taxId', async () => {
    const { service, mockVat } = setup()

    await service.putProfile({
      data: {
        billingAddress: { country: 'FR', line1: '2 Rue Test' },
        passwordCurrent: '',
      },
      aclContext,
    })

    expect(mockVat.assertVatCountryMatchesBilling).toHaveBeenCalledWith(
      'DE123456789',
      'FR',
    )
  })

  it('propagates the mismatch error and does not persist the update', async () => {
    const { service, mockVat, repoUser } = setup()
    mockVat.assertVatCountryMatchesBilling.mockImplementation(() => {
      throw new Error(
        "The VAT number's country must match your billing address country.",
      )
    })

    await expect(
      service.putProfile({
        data: { taxId: 'FR123456789', passwordCurrent: '' },
        aclContext,
      }),
    ).rejects.toThrow(
      "The VAT number's country must match your billing address country.",
    )

    expect(repoUser.updateOne).not.toHaveBeenCalled()
  })

  it('does not call assertVatCountryMatchesBilling when neither field is being updated', async () => {
    const { service, mockVat } = setup()

    await service.putProfile({
      data: { nameFirst: 'Jo', passwordCurrent: '' },
      aclContext,
    })

    expect(mockVat.assertVatCountryMatchesBilling).not.toHaveBeenCalled()
  })

  it('rejects a taxId update with no effective business name', async () => {
    const { service } = setup({ businessName: undefined })

    await expect(
      service.putProfile({
        data: { taxId: 'FR123456789', passwordCurrent: '' },
        aclContext,
      }),
    ).rejects.toThrow(
      'Business name is required when a VAT/tax number is provided',
    )
  })

  it('rejects clearing the stored business name while a taxId is still on file', async () => {
    const { service } = setup()

    await expect(
      service.putProfile({
        data: { businessName: '', passwordCurrent: '' },
        aclContext,
      }),
    ).rejects.toThrow(
      'Business name is required when a VAT/tax number is provided',
    )
  })

  it('accepts a taxId update when a business name is provided alongside it', async () => {
    const { service, repoUser } = setup({ businessName: undefined })

    await service.putProfile({
      data: {
        taxId: 'FR123456789',
        businessName: 'Acme SARL',
        passwordCurrent: '',
      },
      aclContext,
    })

    expect(repoUser.updateOne).toHaveBeenCalledWith(
      { _id: 'user_1' },
      {
        $set: expect.objectContaining({
          taxId: 'FR123456789',
          businessName: 'Acme SARL',
        }),
      },
    )
  })
})

describe('ServiceUser.sendDeletionReminders()', () => {
  it('emails a reminder and sets deletionReminderSentAt once per user', async () => {
    const dueUser = {
      _id: 'user_due',
      email: 'due@example.com',
      nameFirst: 'Bob',
      deletedAt: new Date('2026-01-01'),
    }
    const repoUser = {
      find: jest.fn().mockResolvedValue([dueUser]),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    const mockServiceEmail = { send: jest.fn().mockResolvedValue(undefined) }
    const { service } = makeService({
      repoUser,
      services: { email: mockServiceEmail },
    })

    const result = await service.sendDeletionReminders({
      reminderBeforeDays: 7,
    })

    expect(mockServiceEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'account-deletion-reminder',
        to: dueUser.email,
      }),
    )
    expect(repoUser.updateOne).toHaveBeenCalledWith(
      { _id: dueUser._id },
      {
        $set: expect.objectContaining({
          deletionReminderSentAt: expect.any(Date),
        }),
      },
      { includeDeleted: true },
    )
    expect(result).toEqual({ sent: 1 })
  })
})

describe('ServiceUser.createAccount()', () => {
  function setup(userExists = false) {
    const repoUser = {
      findOne: jest
        .fn()
        .mockResolvedValue(userExists ? { _id: 'existing' } : null),
      insertOne: jest.fn().mockResolvedValue(undefined),
    }
    const { service, mockEventLog } = makeService({ repoUser })
    return { service, repoUser, mockEventLog }
  }

  // Self-hosted's single project is a static, config-sourced value (see
  // model/service/ServiceProject.ts) - this only ever creates a user. Making
  // that user the project owner is a separate, manual operator step
  // (API_PROJECT_OWNER_ID + a restart) - see docs/admin-account-bootstrap.md.
  it('creates a pre-verified user, generating a password when omitted', async () => {
    const { service, repoUser, mockEventLog } = setup()

    const result = await service.createAccount({ email: 'admin@example.com' })

    expect(repoUser.insertOne).toHaveBeenCalledTimes(1)
    const insertedUser = repoUser.insertOne.mock.calls[0][0]
    expect(insertedUser.email).toBe('admin@example.com')
    expect(insertedUser.emailMeta.verify.status.isVerified).toBe(true)
    expect(result.password).toEqual(expect.any(String))
    expect(mockEventLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.accountBootstrapped' }),
    )
  })

  it('does not echo back a password that was supplied explicitly', async () => {
    const { service } = setup()

    const result = await service.createAccount({
      email: 'admin@example.com',
      password: 'Correct-Horse-9',
    })

    expect(result.password).toBeUndefined()
  })

  it('rejects when the email already exists', async () => {
    const { service, repoUser } = setup(true)

    await expect(
      service.createAccount({ email: 'admin@example.com' }),
    ).rejects.toThrow('already exists')
    expect(repoUser.insertOne).not.toHaveBeenCalled()
  })
})

describe('ServiceUser.listAccounts()', () => {
  it("returns users with the configured project attached when they're its owner", async () => {
    const repoUser = {
      find: jest.fn().mockResolvedValue([
        {
          _id: 'user_1',
          email: 'a@example.com',
          nameFirst: 'Ann',
          nameLast: 'Admin',
          createdAt: new Date('2026-01-01'),
        },
        {
          _id: 'user_2',
          email: 'b@example.com',
          nameFirst: 'Bob',
          nameLast: 'Nobody',
          createdAt: new Date('2026-01-02'),
        },
      ]),
    }
    const mockServiceProject = {
      getById: jest.fn().mockResolvedValue({
        _id: 'default',
        name: 'Proj',
        ownerId: 'user_1',
      }),
    }
    const { service } = makeService({
      repoUser,
      services: { project: mockServiceProject },
    })

    const result = await service.listAccounts()

    expect(result).toEqual([
      {
        userId: 'user_1',
        email: 'a@example.com',
        nameFirst: 'Ann',
        nameLast: 'Admin',
        createdAt: new Date('2026-01-01'),
        projects: [{ projectId: 'default', name: 'Proj' }],
      },
      {
        userId: 'user_2',
        email: 'b@example.com',
        nameFirst: 'Bob',
        nameLast: 'Nobody',
        createdAt: new Date('2026-01-02'),
        projects: [],
      },
    ])
    expect(repoUser.find).toHaveBeenCalledWith({})
  })
})

describe('ServiceUser.resetPassword()', () => {
  function setup(userExists = true) {
    const repoUser = {
      findOne: jest
        .fn()
        .mockResolvedValue(
          userExists ? { _id: 'user_1', email: 'a@example.com' } : null,
        ),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    const { service, mockEventLog } = makeService({ repoUser })
    return { service, repoUser, mockEventLog }
  }

  it('resets the password and generates one when omitted', async () => {
    const { service, repoUser, mockEventLog } = setup()

    const result = await service.resetPassword({ email: 'a@example.com' })

    expect(repoUser.updateOne).toHaveBeenCalledWith(
      { _id: 'user_1' },
      { $set: expect.objectContaining({ password: expect.any(String) }) },
    )
    expect(result.password).toEqual(expect.any(String))
    expect(mockEventLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.password.updated' }),
    )
  })

  it('rejects when no account exists for the email', async () => {
    const { service } = setup(false)

    await expect(
      service.resetPassword({ email: 'missing@example.com' }),
    ).rejects.toThrow('No account with that email address exists')
  })
})

describe('ServiceUser.putProfile() — disposable email domain blocking', () => {
  const aclContext = { jwt: { _id: 'user_1' } }

  function setup() {
    const user = {
      _id: 'user_1',
      email: 'a@example.com',
      emailMeta: { history: [], verify: { status: { isVerified: true } } },
    }
    const repoUser = {
      findOne: jest.fn().mockResolvedValue(user),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    const serviceEmailDomainCheck = {
      isDisposableEmailDomain: jest.fn().mockResolvedValue(false),
    }

    const { service, mockEventLog } = makeService({
      repoUser,
      services: { emailDomainCheck: serviceEmailDomainCheck },
    })

    return { service, repoUser, serviceEmailDomainCheck, mockEventLog }
  }

  it('rejects updating to an email at a disposable domain', async () => {
    const { service, repoUser, serviceEmailDomainCheck } = setup()
    serviceEmailDomainCheck.isDisposableEmailDomain.mockResolvedValue(true)

    await expect(
      service.putProfile({
        data: { email: 'new@mailinator.com', passwordCurrent: '' },
        aclContext,
      }),
    ).rejects.toMatchObject({
      constructor: ServerErrorBadRequest,
      ref: 'ERROR_DISPOSABLE_EMAIL_DOMAIN',
    })
    expect(repoUser.updateOne).not.toHaveBeenCalled()
  })
})
