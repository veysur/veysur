import { SchemaEmail } from './SchemaEmail'

beforeEach(() => jest.useRealTimers())

const valid = {
  service: 'smtp',
  type: 'invite',
  to: 'a@example.com',
  from: 'b@example.com',
  subject: 'Hello',
}

describe('SchemaEmail', () => {
  it('accepts a complete email', async () => {
    expect((await new SchemaEmail().validatePaths(valid)).isValid).toBe(true)
  })

  it('rejects a malformed recipient', async () => {
    const { isValid } = await new SchemaEmail().validatePaths({
      ...valid,
      to: 'not-an-address',
    })
    expect(isValid).toBe(false)
  })

  it('rejects an unknown status', async () => {
    const { isValid } = await new SchemaEmail().validatePaths({
      ...valid,
      status: 'lost',
    })
    expect(isValid).toBe(false)
  })
})
