// cspell:ignore mailinator
import { ServiceEmailDomainCheck } from './ServiceEmailDomainCheck'

const makeService = () => {
  const service = new ServiceEmailDomainCheck() as unknown as Omit<
    ServiceEmailDomainCheck,
    'getRepo'
  > & {
    getRepo: jest.Mock
  }

  const repoEmailDomainBlock = {
    isBlocked: jest.fn().mockResolvedValue(false),
  }

  service.getRepo = jest.fn((name: string) => {
    if (name === 'emailDomainBlock') return repoEmailDomainBlock
    throw new Error(`Unexpected repo: ${name}`)
  })

  return { service, repoEmailDomainBlock }
}

describe('ServiceEmailDomainCheck.isDisposableEmailDomain', () => {
  it('extracts the lowercased domain and checks the repo', async () => {
    const { service, repoEmailDomainBlock } = makeService()

    await service.isDisposableEmailDomain('Foo@Mailinator.com')

    expect(repoEmailDomainBlock.isBlocked).toHaveBeenCalledWith(
      'mailinator.com',
    )
  })

  it('returns true when the repo reports the domain is blocked', async () => {
    const { service, repoEmailDomainBlock } = makeService()
    repoEmailDomainBlock.isBlocked.mockResolvedValue(true)

    expect(await service.isDisposableEmailDomain('foo@mailinator.com')).toBe(
      true,
    )
  })

  it('returns false for a legitimate domain', async () => {
    const { service } = makeService()

    expect(await service.isDisposableEmailDomain('foo@example.com')).toBe(false)
  })

  it('returns false for a malformed email with no domain', async () => {
    const { service, repoEmailDomainBlock } = makeService()

    expect(await service.isDisposableEmailDomain('not-an-email')).toBe(false)
    expect(repoEmailDomainBlock.isBlocked).not.toHaveBeenCalled()
  })
})

describe('ServiceEmailDomainCheck.getRejectionRef / assertAcceptable', () => {
  it('returns null for an acceptable address, including a plus address', async () => {
    const { service } = makeService()
    expect(await service.getRejectionRef('a+b@example.com')).toBeNull()
    await expect(
      service.assertAcceptable('a+b@example.com'),
    ).resolves.toBeUndefined()
  })

  it('returns the disposable ref for a blocked domain', async () => {
    const { service, repoEmailDomainBlock } = makeService()
    repoEmailDomainBlock.isBlocked.mockResolvedValue(true)
    expect(await service.getRejectionRef('a@mailinator.com')).toBe(
      'ERROR_DISPOSABLE_EMAIL_DOMAIN',
    )
    await expect(
      service.assertAcceptable('a@mailinator.com', {
        ERROR_DISPOSABLE_EMAIL_DOMAIN: 'Use a permanent address',
      }),
    ).rejects.toMatchObject({
      ref: 'ERROR_DISPOSABLE_EMAIL_DOMAIN',
      userMessage: 'Use a permanent address',
    })
  })
})
