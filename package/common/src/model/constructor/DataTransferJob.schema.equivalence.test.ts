jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaDataTransferJob } from './DataTransferJob.schema'

it('SchemaDataTransferJob validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaDataTransferJob(), {
    _id: 'id1',
    direction: 'import',
    entityType: 'survey',
    format: 'vssp',
    projectId: 'p1',
    requestedByUserId: 'u1',
    status: 'pending',
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})

it('SchemaDataTransferJob accepts free-form option keys', async () => {
  const result = await new SchemaDataTransferJob().validate({
    _id: 'id1',
    direction: 'export',
    entityType: 'survey',
    format: 'vssp',
    projectId: 'p1',
    requestedByUserId: 'u1',
    status: 'pending',
    options: { includeResponses: true, languages: ['en'] },
  } as never)
  expect(result.errors).toEqual({})
  expect(result.isValid).toBe(true)
})
