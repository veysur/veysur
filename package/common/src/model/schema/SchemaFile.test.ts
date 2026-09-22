import { SchemaFile } from './SchemaFile'

describe('SchemaFile', () => {
  jest.useRealTimers()

  const schema = new SchemaFile()

  const baseObject = (): Record<string, unknown> => ({
    _id: 'id1',
    filename: 'photo.png',
    storedFilename: 'stored-photo.png',
    size: 1024,
    mimeType: 'image/png',
    filePath: 'projects/p1/photo.png',
    createdById: 'user1',
  })

  it('accepts every allowed mimeType', async () => {
    const allowed = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'text/csv',
      'application/octet-stream',
    ]

    for (const mimeType of allowed) {
      const result = await schema.validate({ ...baseObject(), mimeType })
      expect(result.isValid).toBe(true)
    }
  })

  it('rejects a browser-executable mimeType, e.g. text/html', async () => {
    const result = await schema.validate({
      ...baseObject(),
      mimeType: 'text/html',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors['mimeType']).toBeDefined()
  })

  it('rejects image/svg+xml', async () => {
    const result = await schema.validate({
      ...baseObject(),
      mimeType: 'image/svg+xml',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors['mimeType']).toBeDefined()
  })
})
