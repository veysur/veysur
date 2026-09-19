// cspell:ignore quot
import { TemplateContext } from './TemplateContext'

export interface ResolveTemplateOptions {
  /**
   * `'html'` (default) HTML-escapes every resolved value before splicing it
   * into the template - literal template text is left untouched. `'none'` is
   * opt-in, for contexts where escaping would corrupt the output: an
   * email-address list (`resolveNotifyRecipients`), or when a consumer
   * otherwise guarantees the destination is not HTML.
   */
  escape?: 'html' | 'none'
  /**
   * `'keep'` (default) leaves an unresolvable `{{...}}` token as literal
   * text, matching System 2's (email template) existing behaviour. `'drop'`
   * removes it entirely, matching System 3's (notify recipients) existing
   * behaviour.
   */
  onUnresolved?: 'keep' | 'drop'
}

const TOKEN_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getPath(root: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (
      current !== null &&
      current !== undefined &&
      typeof current === 'object' &&
      key in (current as object)
    ) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, root)
}

/**
 * Resolves every `{{dotted.path}}` token in `template` against `context`
 * (`answers.*`, `participant.*`, `projectOwner.*`, `survey.*`, `project.*`).
 * A container absent from `context`, or a path with no matching value,
 * resolves per `options.onUnresolved`.
 */
export function resolveTemplate(
  template: string,
  context: TemplateContext,
  options: ResolveTemplateOptions = {},
): string {
  if (!template) return template

  const escape = options.escape ?? 'html'
  const onUnresolved = options.onUnresolved ?? 'keep'

  return template.replace(TOKEN_PATTERN, (match, path: string) => {
    const value = getPath(context, path)
    if (value === undefined || value === null) {
      return onUnresolved === 'keep' ? match : ''
    }
    const str = String(value)
    return escape === 'html' ? escapeHtml(str) : str
  })
}
