import { renderMarkdownToHtml } from './renderMarkdown'

describe('renderMarkdownToHtml', () => {
  test('renders headers', () => {
    expect(renderMarkdownToHtml('# Title')).toContain('<h1>Title</h1>')
  })

  test('renders bold text', () => {
    expect(renderMarkdownToHtml('**bold**')).toContain('<strong>bold</strong>')
  })

  test('renders links', () => {
    const result = renderMarkdownToHtml('[link](https://example.com)')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('>link<')
  })

  test('embedded script tag in markdown source never passes through raw', () => {
    const result = renderMarkdownToHtml('<script>alert(1)</script>')
    expect(result).not.toContain('<script>alert(1)</script>')
  })

  test('embedded onerror attribute in markdown source never passes through raw', () => {
    const result = renderMarkdownToHtml('<img src=x onerror="alert(1)">')
    expect(result).not.toMatch(/<img[^>]*onerror/)
  })

  test('handles empty input', () => {
    expect(renderMarkdownToHtml('')).toBe('')
  })
})
