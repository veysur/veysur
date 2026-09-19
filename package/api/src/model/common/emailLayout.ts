import { EMAIL_LAYOUT_STYLE } from 'veysur-common'

const EMAIL_BODY_MARKER = '%%EMAIL_BODY%%'

const EMAIL_LAYOUT = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${EMAIL_LAYOUT_STYLE}</style></head><body>${EMAIL_BODY_MARKER}</body></html>`

export function wrapEmailBody(bodyFragment: string): string {
  return EMAIL_LAYOUT.replace(EMAIL_BODY_MARKER, bodyFragment)
}
