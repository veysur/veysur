import { HtmlToText } from './HtmlToText'

describe('HtmlToText', () => {
  it('should convert basic HTML to text', () => {
    const html = '<p>Hello World</p>'
    const text = HtmlToText.convert(html)
    expect(text).toContain('Hello World')
  })

  it('should convert links to "Text (URL)" format', () => {
    const html = '<a href="https://example.com">Click Here</a>'
    const text = HtmlToText.convert(html)
    expect(text).toContain('Click Here')
    expect(text).toContain('https://example.com')
    expect(text).toMatch(/Click Here \(https:\/\/example\.com\)/)
  })

  it('should handle email template structure', () => {
    const html = `<html><body>
      <h1>Welcome</h1>
      <p>Dear User,</p>
      <p>Please click: <a href="https://example.com/survey">Start Survey</a></p>
    </body></html>`
    const text = HtmlToText.convert(html)
    expect(text).toContain('Welcome')
    expect(text).toContain('Dear User')
    expect(text).toContain('Start Survey')
    expect(text).toContain('https://example.com/survey')
  })

  it('should handle HTML entities', () => {
    const html = '<p>Tom &amp; Jerry&nbsp;Inc.</p>'
    const text = HtmlToText.convert(html)
    expect(text).toContain('Tom & Jerry')
    expect(text).toContain('Inc.')
  })

  it('should return empty string for empty input', () => {
    expect(HtmlToText.convert('')).toBe('')
    expect(HtmlToText.convert('   ')).toBe('')
  })

  it('should return empty string for null/undefined input', () => {
    expect(HtmlToText.convert(null as unknown as string)).toBe('')
    expect(HtmlToText.convert(undefined as unknown as string)).toBe('')
  })

  it('should handle complex email template', () => {
    const html = `<!DOCTYPE html><html><head><style>body{color:#333}</style></head>
      <body>
        <h1>Invitation</h1>
        <p>Hello <strong>John</strong>,</p>
        <div class="btn">
          <a href="https://example.com/survey/123">Start Survey</a>
        </div>
        <p>If the button doesn't work:<br>https://example.com/survey/123</p>
      </body></html>`
    const text = HtmlToText.convert(html)
    expect(text).toContain('Invitation')
    expect(text).toContain('Hello John')
    expect(text).toContain('Start Survey')
    expect(text).toContain('https://example.com/survey/123')
  })

  it('should skip images in text version', () => {
    const html = '<p>Hello</p><img src="logo.png" alt="Logo"><p>World</p>'
    const text = HtmlToText.convert(html)
    expect(text).toContain('Hello')
    expect(text).toContain('World')
    expect(text).not.toContain('logo.png')
  })

  it('should preserve multiple paragraphs with spacing', () => {
    const html =
      '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>'
    const text = HtmlToText.convert(html)
    expect(text).toContain('First paragraph')
    expect(text).toContain('Second paragraph')
    expect(text).toContain('Third paragraph')
  })

  it('should handle nested tags', () => {
    const html =
      '<div><p>Outer <span>middle <strong>inner</strong> text</span> more</p></div>'
    const text = HtmlToText.convert(html)
    expect(text).toContain('Outer middle inner text more')
  })

  it('should handle multiple links in text', () => {
    const html = `
      <p>Visit <a href="https://example.com">our site</a> or <a href="https://example.com/help">get help</a></p>
    `
    const text = HtmlToText.convert(html)
    expect(text).toContain('our site')
    expect(text).toContain('https://example.com')
    expect(text).toContain('get help')
    expect(text).toContain('https://example.com/help')
  })

  it('should handle real email template from invite.json', () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}h1{color:#2c3e50;font-size:24px;margin-bottom:20px}.btn{display:inline-block;padding:12px 24px;background-color:#3498db;color:#ffffff;text-decoration:none;border-radius:4px;margin:20px 0}.footer{margin-top:30px;padding-top:20px;border-top:1px solid #e0e0e0;font-size:12px;color:#666}</style></head><body><h1>You're invited to participate</h1><p>Dear John,</p><p>We would like to invite you to participate in <strong>Customer Satisfaction Survey</strong> as part of Acme Corp.</p><p>Your input is valuable to us and will help us improve our services. The survey should take approximately 10-15 minutes to complete.</p><p><a href="https://example.com/survey/123" class="btn">Start Survey</a></p><p>If the button above doesn't work, you can copy and paste this link into your browser:<br>https://example.com/survey/123</p><p>Thank you for your time and participation!</p><div class="footer"><p>This is an automated message from Acme Corp. Please do not reply to this email.</p></div></body></html>`
    const text = HtmlToText.convert(html)

    expect(text).toContain("You're invited to participate")
    expect(text).toContain('Dear John')
    expect(text).toContain('Customer Satisfaction Survey')
    expect(text).toContain('Acme Corp')
    expect(text).toContain('Start Survey')
    expect(text).toContain('https://example.com/survey/123')
    expect(text).toContain('10-15 minutes')
    expect(text).toContain('Thank you for your time and participation')
    expect(text).toContain('This is an automated message')
  })
})
