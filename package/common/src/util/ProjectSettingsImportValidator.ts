import momentTimezone from 'moment-timezone'

import { sanitizeContent } from '../model/content/sanitizeContent'

export const PROJECT_SETTINGS_VERSION = '1.0'

// schedule dates go stale; stats.questions is keyed by survey-specific codes
export const PROJECT_SETTINGS_EXCLUDED_KEYS = [
  '_id',
  'createdAt',
  'updatedAt',
  'schedule',
  'stats',
] as const

// `team-invite` is a system email, not editable as a project default

export const PROJECT_EMAIL_TEMPLATE_TYPES = [
  'invite',
  'reminder',
  'thankYou',
  'adminBasic',
  'adminDetail',
] as const

const EMAIL_TEMPLATE_LANG_MAX_LENGTH = 3

const L10N_HTML_PATHS: string[][] = [
  ['dataPolicy', 'text'],
  ['legalNotice', 'text'],
  ['welcome', 'message'],
  ['thankYou', 'message'],
]

export type ProjectSettingsData = Record<string, unknown>

export interface ProjectSettingsManifest {
  version: string
  timezone?: string
}

export interface ProjectEmailTemplateEntry {
  type: string
  lang: string
  subject: string | null
  body: string | null
}

export interface ProjectSettingsRawImport {
  manifest: unknown
  settings: unknown | null
  templates: unknown[]
}

export interface ProjectSettingsValidatedImport {
  timezone: string | null
  settings: ProjectSettingsData | null
  templates: ProjectEmailTemplateEntry[]
}

export interface ProjectSettingsValidationError {
  part: 'manifest' | 'timezone' | 'settings' | 'templates'
  message: string
  path?: string
}

export interface ProjectSettingsValidationResult {
  valid: boolean
  errors: ProjectSettingsValidationError[]
  warnings: string[]
  data: ProjectSettingsValidatedImport
}

// Satisfied by a datacapy Schema from the model manager, which has the date
// casters configured; a bare `new SchemaSettingSurvey()` cannot validate.
export interface SettingsSchemaValidator {
  validate(candidate: ProjectSettingsData): Promise<{
    isValid?: boolean
    errors?: Record<string, unknown>
  }>
}

export class ProjectSettingsImportValidator {
  constructor(private readonly schema: SettingsSchemaValidator) {}

  async validate(
    raw: ProjectSettingsRawImport,
  ): Promise<ProjectSettingsValidationResult> {
    const errors: ProjectSettingsValidationError[] = []
    const warnings: string[] = []
    const data: ProjectSettingsValidatedImport = {
      timezone: null,
      settings: null,
      templates: [],
    }

    data.timezone = this.validateManifest(raw.manifest, errors)

    if (raw.settings !== null) {
      data.settings = await this.validateSettings(
        raw.settings,
        errors,
        warnings,
      )
    }

    data.templates = this.validateTemplates(raw.templates, errors)

    return { valid: errors.length === 0, errors, warnings, data }
  }

  isValidTimezone(value: unknown): value is string {
    return typeof value === 'string' && momentTimezone.tz.zone(value) !== null
  }

  private validateManifest(
    manifest: unknown,
    errors: ProjectSettingsValidationError[],
  ): string | null {
    if (!this.isRecord(manifest)) {
      errors.push({
        part: 'manifest',
        message: 'project.json must be an object',
      })
      return null
    }
    if (manifest.version !== PROJECT_SETTINGS_VERSION) {
      errors.push({
        part: 'manifest',
        path: 'version',
        message: `Unsupported project settings format version: ${String(manifest.version)} (expected ${PROJECT_SETTINGS_VERSION})`,
      })
      return null
    }
    if (manifest.timezone === undefined) return null
    if (!this.isValidTimezone(manifest.timezone)) {
      errors.push({
        part: 'timezone',
        path: 'timezone',
        message: `Unknown timezone: ${String(manifest.timezone)}`,
      })
      return null
    }
    return manifest.timezone
  }

  private async validateSettings(
    settings: unknown,
    errors: ProjectSettingsValidationError[],
    warnings: string[],
  ): Promise<ProjectSettingsData | null> {
    if (!this.isRecord(settings)) {
      errors.push({
        part: 'settings',
        message: 'settings/survey.json must be an object',
      })
      return null
    }

    // Schema.validate() casts and fills defaults in place, and requires an _id
    const candidate: ProjectSettingsData = {
      ...JSON.parse(JSON.stringify(settings)),
    }
    for (const key of PROJECT_SETTINGS_EXCLUDED_KEYS) {
      if (key !== '_id' && key in candidate) {
        warnings.push(`settings/survey.json: ignored excluded key "${key}"`)
      }
      delete candidate[key]
    }
    candidate._id = 'import'

    let schemaErrors: Record<string, unknown>
    try {
      const result = await this.schema.validate(candidate)
      schemaErrors = result.isValid
        ? {}
        : (result.errors ?? { settings: 'invalid' })
    } catch (error) {
      schemaErrors = { settings: String(error) }
    }
    if (Object.keys(schemaErrors).length > 0) {
      for (const [path, detail] of Object.entries(schemaErrors)) {
        errors.push({
          part: 'settings',
          path,
          message: `Invalid setting "${path}": ${JSON.stringify(detail)}`,
        })
      }
      return null
    }

    for (const key of PROJECT_SETTINGS_EXCLUDED_KEYS) delete candidate[key]
    this.sanitiseHtml(candidate, warnings)
    this.warnOnRiskyContentFormat(candidate, warnings)
    return candidate
  }

  private sanitiseHtml(settings: ProjectSettingsData, warnings: string[]) {
    for (const path of L10N_HTML_PATHS) {
      const parent = path
        .slice(0, -1)
        .reduce<unknown>(
          (node, key) => (this.isRecord(node) ? node[key] : undefined),
          settings,
        )
      const field = path[path.length - 1]
      if (!this.isRecord(parent) || !this.isRecord(parent[field])) continue

      const map = parent[field] as Record<string, unknown>
      for (const [lang, value] of Object.entries(map)) {
        if (typeof value !== 'string') continue
        const clean = sanitizeContent(value, { scriptTagsAllowed: false })
        if (clean !== value) {
          warnings.push(
            `settings/survey.json: unsafe HTML removed from ${path.join('.')}.${lang}`,
          )
          map[lang] = clean
        }
      }
    }
  }

  private warnOnRiskyContentFormat(
    settings: ProjectSettingsData,
    warnings: string[],
  ) {
    const contentFormat = settings.contentFormat
    if (!this.isRecord(contentFormat)) return
    if (contentFormat.scriptTagsAllowed === true) {
      warnings.push(
        'Settings allow <script> tags in survey content (contentFormat.scriptTagsAllowed)',
      )
    }
    if (contentFormat.htmlAllowed === true) {
      warnings.push(
        'Settings allow raw HTML in survey content (contentFormat.htmlAllowed)',
      )
    }
  }

  private validateTemplates(
    templates: unknown[],
    errors: ProjectSettingsValidationError[],
  ): ProjectEmailTemplateEntry[] {
    const valid: ProjectEmailTemplateEntry[] = []
    const seen = new Set<string>()

    for (const [index, entry] of templates.entries()) {
      const path = `templates[${index}]`
      if (!this.isRecord(entry)) {
        errors.push({
          part: 'templates',
          path,
          message: 'Template must be an object',
        })
        continue
      }
      const { type, lang, subject = null, body = null } = entry

      if (
        typeof type !== 'string' ||
        !(PROJECT_EMAIL_TEMPLATE_TYPES as readonly string[]).includes(type)
      ) {
        errors.push({
          part: 'templates',
          path,
          message: `Unknown email template type: ${String(type)}`,
        })
        continue
      }
      if (
        typeof lang !== 'string' ||
        lang.length === 0 ||
        lang.length > EMAIL_TEMPLATE_LANG_MAX_LENGTH
      ) {
        errors.push({
          part: 'templates',
          path,
          message: `Invalid email template language: ${String(lang)}`,
        })
        continue
      }
      if (!this.isStringOrNull(subject) || !this.isStringOrNull(body)) {
        errors.push({
          part: 'templates',
          path,
          message: 'Template subject and body must be strings or null',
        })
        continue
      }
      const key = `${type}:${lang}`
      if (seen.has(key)) {
        errors.push({
          part: 'templates',
          path,
          message: `Duplicate email template: ${key}`,
        })
        continue
      }
      seen.add(key)
      valid.push({ type, lang, subject, body })
    }

    return valid
  }

  private isStringOrNull(value: unknown): value is string | null {
    return value === null || typeof value === 'string'
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
