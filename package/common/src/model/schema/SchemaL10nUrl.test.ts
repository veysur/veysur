import { SchemaL10nUrl } from './SchemaL10nUrl'

describe('SchemaL10nUrl', () => {
  const applyFilters = async (url: string) => {
    const schema = new SchemaL10nUrl()
    const result = await schema.applyFilters({ en: url })
    return result.en
  }

  it('should prepend http:// to a URL with no protocol prefix', async () => {
    expect(await applyFilters('example.com')).toBe('http://example.com')
  })

  it('should leave a URL with an https:// prefix unchanged', async () => {
    expect(await applyFilters('https://example.com')).toBe(
      'https://example.com',
    )
  })

  it('should leave a URL with a non-http protocol prefix unchanged', async () => {
    expect(await applyFilters('mailto:info@example.com')).toBe(
      'mailto:info@example.com',
    )
  })
})
