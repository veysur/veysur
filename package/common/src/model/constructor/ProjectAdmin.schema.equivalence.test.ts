jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaProjectAdmin } from './ProjectAdmin.schema'

it('SchemaProjectAdmin validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaProjectAdmin(), {
    _id: 'a1',
    projectId: 'p1',
    createdById: 'u1',
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
