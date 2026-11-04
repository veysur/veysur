import { SchemaMigrationLog } from './SchemaMigrationLog'

beforeEach(() => jest.useRealTimers())

const valid = {
  runId: 'run1',
  dataSourceName: 'account',
  contextKey: 'account',
  status: 'pending',
  createdAt: new Date(),
}

describe('SchemaMigrationLog', () => {
  it('accepts a seeded pending row', async () => {
    const { isValid } = await new SchemaMigrationLog().validatePaths(valid)
    expect(isValid).toBe(true)
  })

  it('rejects an unknown datasource', async () => {
    const { isValid } = await new SchemaMigrationLog().validatePaths({
      ...valid,
      dataSourceName: 'other',
    })
    expect(isValid).toBe(false)
  })

  it('rejects an unknown status', async () => {
    const { isValid } = await new SchemaMigrationLog().validatePaths({
      ...valid,
      status: 'paused',
    })
    expect(isValid).toBe(false)
  })
})
