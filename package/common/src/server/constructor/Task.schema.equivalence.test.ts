jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaTask } from './Task.schema'

it('SchemaTask validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaTask(), {
    _id: 't1',
    name: 'cleanup',
    start: new Date('2026-01-01T00:00:00Z'),
    interval: 60,
    task: 'file',
    action: 'cleanup',
    options: { limit: 5 },
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
