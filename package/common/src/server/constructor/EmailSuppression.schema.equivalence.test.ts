jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaEmailSuppression } from './EmailSuppression.schema'

it('SchemaEmailSuppression validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaEmailSuppression(), {
    _id: 's1',
    email: 'A@Example.com ',
    reason: 'hardBounce',
    hardBounceEvents: [{ occurredAt: new Date('2026-01-01T00:00:00Z') }],
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
