jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { schemaManager } from '../schema-manager'

it('the user schema validates as recorded and rejects unknown keys', async () => {
  await schemaManager.init()
  const behaviour = await schemaBehaviour(schemaManager.getSchema('user'), {
    _id: 'u1',
    nameFirst: ' Ada ',
    nameLast: 'Lovelace',
    email: ' Ada@Example.COM ',
    emailMeta: {
      verify: {
        status: { isVerified: true, isVerifiedAt: new Date('2026-01-01') },
        token: [
          {
            token: 'abc',
            ttl: 60,
            createdAt: new Date('2026-01-01'),
            expiresAt: new Date('2026-01-02'),
            failCount: 0,
          },
        ],
      },
      history: [
        {
          prevValue: 'old@example.com',
          verifyStatus: { isVerified: false, isVerifiedAt: null },
          clientId: 'c1',
        },
      ],
    },
    password: 'hash',
    passwordMeta: { reset: { token: [] } },
    twoFactorSecret: 'secret',
    twoFactorMeta: { enabled: true, prompt: { dismissed: true } },
    maxClients: 3,
    role: 'platformAdmin',
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})

it('the user schema rejects a role outside the allowed set and a null email', async () => {
  await schemaManager.init()
  const schema = schemaManager.getSchema('user')
  const bad = await schemaBehaviour(schema, {
    _id: 'u1',
    nameFirst: 'A',
    nameLast: 'B',
    email: null,
    role: 'nope',
  })
  expect(bad).toMatchSnapshot()
})
