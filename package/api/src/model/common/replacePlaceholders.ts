import { resolveTemplate, TemplateContext } from 'veysur-common'

/**
 * Replace {{variableName}} placeholders in a template string with values from
 * data. Placeholders with no matching key are left untouched. Implemented on
 * top of `resolveTemplate`, wrapping the flat `data` object as a single-level
 * `answers` container so today's flat `{{word}}` template syntax keeps
 * working unchanged - each system migrates to `{{answers.x}}`/
 * `{{participant.x}}` container syntax in its own phase.
 *
 * Resolved values are HTML-escaped (`resolveTemplate`'s default) - a
 * deliberate behaviour change from the previous unescaped implementation,
 * since this output is spliced into HTML email bodies.
 */
export function replacePlaceholders(
  template: string,
  data: Record<string, unknown>,
): string {
  if (!template) return template

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) return match
    // A key present but holding null/undefined stringifies directly (matching
    // the previous implementation) rather than going through resolveTemplate,
    // which treats null/undefined as "unresolved" and would otherwise leak
    // its own internal `{{answers.<key>}}` wrapper token into the output.
    if (data[key] === null || data[key] === undefined) {
      return String(data[key])
    }
    const context: TemplateContext = { participant: {}, answers: data }
    return resolveTemplate(`{{answers.${key}}}`, context)
  })
}
