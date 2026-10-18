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
  const repoSettingProject = {}
  const repoProject = {
    find: jest.fn().mockResolvedValue([{ _id: 'p1' }, { _id: 'p2' }]),
  }
  const service = asPrivate<
    ServiceEncryptionRotation,
    { getRepo: jest.Mock; modelManager: unknown }
  >(new ServiceEncryptionRotation())
  service.modelManager = { config: { encryptionService } }
  service.getRepo = jest.fn((name: string) => {
    if (name === 'task') return repoTask
    if (name === 'user') return repoUser
    if (name === 'settingProject') return repoSettingProject
    if (name === 'project') return repoProject
    throw new Error(`Unexpected repo: ${name}`)
  })
  return { service, repoTask, repoProject }
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

describe('ServiceEncryptionRotation.reencryptProjectSettings', () => {
  beforeEach(() => mockRun.mockReset())

  it('rewraps each project in its own context and merges the reports', async () => {
    mockRun
      .mockResolvedValueOnce({
        scanned: 1,
        rewrapped: 1,
        skipped: 0,
        failed: 0,
        byKid: { default: 2 },
      })
      .mockResolvedValueOnce({
        scanned: 1,
        rewrapped: 0,
        skipped: 1,
        failed: 0,
        byKid: { default: 1, '2026': 1 },
      })
    const { service, repoTask } = makeService(makeEncryptionService())

    const result = await service.reencryptProjectSettings({ batchSize: 2 })

    expect(mockRun).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      scanned: 2,
      rewrapped: 1,
      skipped: 1,
      byKid: { default: 3, '2026': 1 },
      lastId: 'p2',
      done: false,
    })
    expect(repoTask.updateOne).toHaveBeenCalledWith(
      { task: 'encryptionRotation', action: 'reencryptProjectSettings' },
      { $set: { options: { batchSize: 2, dryRun: false, afterId: 'p2' } } },
    )
  })

  it('resets the cursor once every project is covered', async () => {
    mockRun.mockResolvedValue({
      scanned: 0,
      rewrapped: 0,
      skipped: 0,
      failed: 0,
      byKid: {},
    })
    const { service, repoTask } = makeService(makeEncryptionService())

    await service.reencryptProjectSettings({ batchSize: 5 })

    expect(repoTask.updateOne).toHaveBeenCalledWith(expect.anything(), {
      $set: { options: { batchSize: 5, dryRun: false, afterId: null } },
    })
  })

  it('throws when field encryption is not configured', async () => {
    const { service } = makeService(undefined)
    await expect(service.reencryptProjectSettings({})).rejects.toThrow(
      'Field encryption is not configured',
    )
  })
})
