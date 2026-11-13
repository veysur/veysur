jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaTaskExecution } from './TaskExecution.schema'

it('SchemaTaskExecution validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaTaskExecution(), {
    _id: 'e1',
    taskId: 't1',
    taskName: 'cleanup',
    status: 'completed',
    duration: 0,
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
