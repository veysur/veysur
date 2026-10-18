import { ModelManager } from '@datacapy/om'
import SeedEncryptionRotationTask from './2026-10-18_1000_seed-encryption-rotation-task'

const makeModelManager = (existing: unknown) => {
  const repo = {
    findOne: jest.fn().mockResolvedValue(existing),
    insertOne: jest.fn().mockResolvedValue(undefined),
  }
  const modelManager = {
    getRepo: jest.fn().mockReturnValue(repo),
  } as unknown as ModelManager
  return { modelManager, repo }
}

describe('SeedEncryptionRotationTask', () => {
  it('inserts the task disabled and in dry-run mode', async () => {
    const { modelManager, repo } = makeModelManager(null)
    await new SeedEncryptionRotationTask().update(modelManager)

    expect(repo.insertOne).toHaveBeenCalledTimes(1)
    expect(repo.insertOne.mock.calls[0][0]).toMatchObject({
      enabled: false,
      task: 'encryptionRotation',
      action: 'reencryptUsers',
      options: { dryRun: true, afterId: null },
    })
  })

  it('does nothing when the task already exists', async () => {
    const { modelManager, repo } = makeModelManager({ _id: 'x' })
    await new SeedEncryptionRotationTask().update(modelManager)
    expect(repo.insertOne).not.toHaveBeenCalled()
  })
})
