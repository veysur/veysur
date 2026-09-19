export type ContentFormat = 'markdown' | 'html' | 'plain'

export interface ResolveContentFormatInput {
  htmlAllowed: boolean
  markdownAllowed: boolean
}

// Single source of truth for the content-format precedence rule. Used
// identically by the app (editor mode, render format) and by api/common
// (publish validation) so client render and server validation can never
// drift from each other.
export function resolveContentFormat({
  htmlAllowed,
  markdownAllowed,
}: ResolveContentFormatInput): ContentFormat {
  if (markdownAllowed) {
    return 'markdown'
  }
  if (htmlAllowed) {
    return 'html'
  }
  return 'plain'
}
