import { escapeHtml } from '../service/SurveyExpression/resolveTextExpressions'
import { ContentFormat } from './resolveContentFormat'
import { renderMarkdownToHtml } from './renderMarkdown'
import { sanitizeContent } from './sanitizeContent'

export interface RenderContentOptions {
  format: ContentFormat
  scriptTagsAllowed?: boolean
}

// Single entry point for turning raw stored content into safe-to-render
// HTML. Used identically by app render sites and reasoned about identically
// by server-side publish validation, so client render and server
// enforcement can never drift.
export function renderContentToSafeHtml(
  raw: string,
  { format, scriptTagsAllowed = false }: RenderContentOptions,
): string {
  const value = raw ?? ''

  if (format === 'plain') {
    return escapeHtml(value)
  }

  if (format === 'markdown') {
    return sanitizeContent(renderMarkdownToHtml(value), { scriptTagsAllowed })
  }

  // format === 'html'
  return sanitizeContent(value, { scriptTagsAllowed })
}

// Escape mode `resolveTextExpressions` must use so a resolved (often
// participant-controlled) expression value stays inert once this format's
// renderer runs over the template. `html` needs HTML escaping (the token
// scan runs on raw HTML before sanitisation); `markdown` needs Markdown
// metacharacters neutralised on top of that. `plain` needs *no* escaping:
// the plain-format renderer emits the resolved template as a React text
// node (see `SurveyContent`), which the DOM escapes on its own - escaping
// here as well would double-encode, so `we're` would show as `we&#39;re`.
export function expressionEscapeForContentFormat(
  format: ContentFormat,
): 'none' | 'html' | 'markdown' {
  if (format === 'markdown') return 'markdown'
  if (format === 'plain') return 'none'
  return 'html'
}
