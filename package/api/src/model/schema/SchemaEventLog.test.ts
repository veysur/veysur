import { SchemaEventLog } from './SchemaEventLog'
import { SchemaEventLogSystem } from './SchemaEventLogSystem'

beforeEach(() => jest.useRealTimers())

describe.each([
  ['SchemaEventLog', SchemaEventLog],
  ['SchemaEventLogSystem', SchemaEventLogSystem],
])('%s', (_name, Ctor) => {
  const valid = { action: 'survey.publish', createdAt: new Date() }

  it('accepts an event', async () => {
    expect((await new Ctor().validatePaths(valid)).isValid).toBe(true)
  })

  it('rejects an event without an action', async () => {
    const { isValid } = await new Ctor().validatePaths({
      ...valid,
      action: null,
    })
    expect(isValid).toBe(false)
  })
})
