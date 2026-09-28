import { Readable } from 'stream'

import { MarkdownFormatHandler } from './MarkdownFormatHandler'

describe('MarkdownFormatHandler', () => {
  const handler = new MarkdownFormatHandler()

  test('serialize/parse round-trips a plain string', async () => {
    const text = '# Title\n\nSome body text.\n'
    const stream = handler.serialize(text)
    const parsed = await handler.parse(stream)
    expect(parsed).toBe(text)
  })

  test('parse buffers a multi-chunk stream', async () => {
    const stream = Readable.from(
      ['# Title\n', '\n', 'Body.\n'].map((chunk) => Buffer.from(chunk)),
    )
    const parsed = await handler.parse(stream)
    expect(parsed).toBe('# Title\n\nBody.\n')
  })

  test('getFilename produces a dated .md filename', () => {
    const filename = handler.getFilename('survey', 'survey-1')
    expect(filename).toMatch(/^survey-survey-1-\d{4}-\d{2}-\d{2}\.md$/)
  })

  test('getMimeType is text/markdown', () => {
    expect(handler.getMimeType()).toBe('text/markdown')
  })

  test('format/extensions metadata', () => {
    expect(handler.format).toBe('markdown')
    expect(handler.extensions).toEqual(['.md'])
  })
})
