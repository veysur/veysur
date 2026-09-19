import {
  EMAIL_PREVIEW_CONTENT_CLASS,
  EMAIL_PREVIEW_CSS,
} from './emailPreviewCss'

describe('emailPreviewCss', () => {
  it('scopes the body rule to the preview content class itself', () => {
    expect(EMAIL_PREVIEW_CSS).toContain(
      `.${EMAIL_PREVIEW_CONTENT_CLASS}{font-family:Arial,sans-serif`,
    )
  })

  it('scopes descendant selectors under the preview content class', () => {
    expect(EMAIL_PREVIEW_CSS).toContain(`.${EMAIL_PREVIEW_CONTENT_CLASS} .btn{`)
    expect(EMAIL_PREVIEW_CSS).toContain(`.${EMAIL_PREVIEW_CONTENT_CLASS} h1{`)
  })

  it('preserves the original .btn declarations (white text on a coloured background)', () => {
    expect(EMAIL_PREVIEW_CSS).toMatch(
      /\.btn\{[^}]*background-color:#3498db[^}]*color:#ffffff/,
    )
  })
})
