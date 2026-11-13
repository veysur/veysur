import { SchemaFile } from './File.schema'
import { ALLOWED_FILE_MIME_TYPES } from '../schema/constant'

it('allows exactly the mime types in ALLOWED_FILE_MIME_TYPES', () => {
  const spec = new SchemaFile().getSpec() as {
    mimeType: { $validate: { inArray: { values: string[] } } }
  }
  expect([...spec.mimeType.$validate.inArray.values].sort()).toEqual(
    [...ALLOWED_FILE_MIME_TYPES].sort(),
  )
})
