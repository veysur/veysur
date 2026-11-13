jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaProject } from './Project.schema'

it('SchemaProject validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaProject(), {
    _id: 'p1',
    name: 'Project',
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
