import {
  renderContentToSafeHtml,
  expressionEscapeForContentFormat,
} from './renderContent'

describe('renderContentToSafeHtml', () => {
  test('plain format escapes all markup', () => {
    const result = renderContentToSafeHtml(
      '<b>hi</b> & <script>alert(1)</script>',
      {
        format: 'plain',
      },
    )
    expect(result).not.toContain('<b>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;b&gt;')
    expect(result).toContain('&amp;')
  })

  test('markdown format renders and sanitizes', () => {
    const result = renderContentToSafeHtml(
      '**bold** <script>alert(1)</script>',
      {
        format: 'markdown',
      },
    )
    expect(result).toContain('<strong>bold</strong>')
    expect(result).not.toContain('<script>')
  })

  test('html format sanitizes directly', () => {
    const result = renderContentToSafeHtml(
      '<p>hi</p><img src=x onerror=alert(1)>',
      { format: 'html' },
    )
    expect(result).toContain('<p>hi</p>')
    expect(result).not.toContain('onerror')
  })

  test('html format with scriptTagsAllowed keeps script tags', () => {
    const result = renderContentToSafeHtml('<script>alert(1)</script>', {
      format: 'html',
      scriptTagsAllowed: true,
    })
    expect(result).toContain('<script>')
  })

  test('handles null/empty input', () => {
    expect(renderContentToSafeHtml('', { format: 'plain' })).toBe('')
    expect(renderContentToSafeHtml('', { format: 'markdown' })).toBe('')
    expect(renderContentToSafeHtml('', { format: 'html' })).toBe('')
  })
})

describe('expressionEscapeForContentFormat', () => {
  test('markdown needs markdown escaping', () => {
    expect(expressionEscapeForContentFormat('markdown')).toBe('markdown')
  })

  test('html uses html escaping', () => {
    expect(expressionEscapeForContentFormat('html')).toBe('html')
  })

  test('plain needs no escaping - the renderer emits a React text node', () => {
    expect(expressionEscapeForContentFormat('plain')).toBe('none')
  })
})
