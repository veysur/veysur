import { EMAIL_LAYOUT_STYLE } from 'veysur-common'

// Class added to the editable content area when `emailPreview` is set on
// ContentEditor, so admins editing an email template see the same `.btn`,
// `.footer`, etc. styling the recipient's email client will apply — the
// server wraps saved bodies in the same EMAIL_LAYOUT_STYLE (see
// package/api/src/model/common/emailLayout.ts), but the editor's own DOM
// doesn't otherwise load that stylesheet, so e.g. a white button loses its
// background and disappears against the editor's white content area.
export const EMAIL_PREVIEW_CONTENT_CLASS = 'email-preview-content'

const scopeEmailLayoutCss = (css: string, scopeClass: string): string =>
  css
    .split('}')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const [selectorPart, declarations] = rule.split('{')
      const scopedSelectors = selectorPart
        .split(',')
        .map((selector) => selector.trim())
        .map((selector) =>
          selector === 'body' ? `.${scopeClass}` : `.${scopeClass} ${selector}`,
        )
        .join(', ')
      return `${scopedSelectors}{${declarations}}`
    })
    .join('\n')

export const EMAIL_PREVIEW_CSS = scopeEmailLayoutCss(
  EMAIL_LAYOUT_STYLE,
  EMAIL_PREVIEW_CONTENT_CLASS,
)
