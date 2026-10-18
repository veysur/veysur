import { generateKeyPairSync } from 'crypto'
import { SchemaEncryptionServiceRsa } from '@datacapy/om'
import { asPrivate } from 'test-utils/asPrivate'
import { ServiceEncryptionRotation } from './ServiceEncryptionRotation'

const mockRun = jest.fn()
jest.mock('@datacapy/om', () => ({
  ...jest.requireActual('@datacapy/om'),
  EncryptionReencryptor: jest.fn().mockImplementation(() => ({ run: mockRun })),
}))

const makeService = (encryptionService?: unknown) => {
  const repoTask = { updateOne: jest.fn().mockResolvedValue({ count: 1 }) }
  const repoUser = {}
  const service = asPrivate<
    ServiceEncryptionRotation,
    { getRepo: jest.Mock; modelManager: unknown }
  >(new ServiceEncryptionRotation())
  service.modelManager = { config: { encryptionService } }
  service.getRepo = jest.fn((name: string) => {
    if (name === 'task') return repoTask
    if (name === 'user') return repoUser
    throw new Error(`Unexpected repo: ${name}`)
  })
  return { service, repoTask }
}

const makeEncryptionService = () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  return new SchemaEncryptionServiceRsa({ publicKey, privateKey })
}

describe('ServiceEncryptionRotation.reencryptUsers', () => {
  beforeEach(() => mockRun.mockReset())

  it('throws when field encryption is not configured', async () => {
    const { service } = makeService(undefined)
    await expect(service.reencryptUsers({})).rejects.toThrow(
      'Field encryption is not configured',
    )
  })

  it('saves the cursor on the task when more documents remain', async () => {
    mockRun.mockResolvedValue({ scanned: 2, lastId: 'u2', done: false })
    const { service, repoTask } = makeService(makeEncryptionService())

    const result = await service.reencryptUsers({ batchSize: 2 })

    expect(mockRun).toHaveBeenCalledWith({
      batchSize: 2,
      dryRun: false,
      afterId: undefined,
    })
    expect(repoTask.updateOne).toHaveBeenCalledWith(
      { task: 'encryptionRotation', action: 'reencryptUsers' },
      { $set: { options: { batchSize: 2, dryRun: false, afterId: 'u2' } } },
    )
    expect(result).toMatchObject({ scanned: 2, dryRun: false })
  })

  it('resets the cursor once the collection is covered', async () => {
    mockRun.mockResolvedValue({ scanned: 1, lastId: 'u9', done: true })
    const { service, repoTask } = makeService(makeEncryptionService())

    await service.reencryptUsers({ afterId: 'u8' })

    expect(repoTask.updateOne).toHaveBeenCalledWith(expect.anything(), {
      $set: {
        options: { batchSize: undefined, dryRun: false, afterId: null },
      },
    })
  })

  it('leaves the cursor alone on a dry run', async () => {
    mockRun.mockResolvedValue({ scanned: 1, lastId: 'u1', done: true })
    const { service, repoTask } = makeService(makeEncryptionService())

    const result = await service.reencryptUsers({ dryRun: true })

    expect(repoTask.updateOne).not.toHaveBeenCalled()
    expect(result.dryRun).toBe(true)
  })
})
