import { SchemaTaskLock } from './SchemaTaskLock'

beforeEach(() => jest.useRealTimers())

const valid = {
  lockKey: 'export-project-abc',
  resourceType: 'project',
  resourceId: 'abc',
  executionId: 'exec-1',
  lockedAt: new Date(),
  expiresAt: new Date(),
}

describe('SchemaTaskLock', () => {
  it('accepts a complete lock', async () => {
    const { isValid } = await new SchemaTaskLock().validatePaths(valid)
    expect(isValid).toBe(true)
  })

  it('rejects an over-long lockKey', async () => {
    const { isValid } = await new SchemaTaskLock().validatePaths({
      ...valid,
      lockKey: 'x'.repeat(256),
    })
    expect(isValid).toBe(false)
  })

  it('rejects an over-long note', async () => {
    const { isValid } = await new SchemaTaskLock().validatePaths({
      ...valid,
      note: 'x'.repeat(1001),
    })
    expect(isValid).toBe(false)
  })
})
