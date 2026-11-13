jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaFile } from './File.schema'

it('SchemaFile validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaFile(), {
    _id: 'f1',
    filename: 'a.png',
    storedFilename: 'b.png',
    size: 10,
    mimeType: 'image/png',
    filePath: 'p/b.png',
    createdById: 'u1',
    refs: [{ type: 'survey', id: 's1' }],
    import: {
      entityType: 'survey',
      format: 'vssp',
      options: { force: true, apply: ['settings'] },
      status: 'queued',
      result: { success: true, repairs: [], error: 'e' },
    },
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
