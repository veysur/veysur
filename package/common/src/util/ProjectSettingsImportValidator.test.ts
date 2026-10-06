import {
  PROJECT_SETTINGS_VERSION,
  ProjectSettingsImportValidator,
  ProjectSettingsRawImport,
  SettingsSchemaValidator,
} from './ProjectSettingsImportValidator'
import { SchemaL10n } from '../model/schema/SchemaL10n'
import { SchemaL10nHtml } from '../model/schema/SchemaL10nHtml'
import { SchemaL10nUrl } from '../model/schema/SchemaL10nUrl'
import { SchemaSettingSurvey } from '../model/schema/SchemaSettingSurvey'

const build = (
  overrides: Partial<ProjectSettingsRawImport> = {},
): ProjectSettingsRawImport => ({
  manifest: { version: PROJECT_SETTINGS_VERSION, timezone: 'Europe/London' },
  settings: null,
  templates: [],
  ...overrides,
})

const KNOWN_KEYS = [
  'language',
  'access',
  'presentation',
  'dataPolicy',
  'contentFormat',
]

// The real schema needs the model manager's date casters; the API-side
// handler tests exercise it for real.
const stubSchema: SettingsSchemaValidator = {
  validate: async (candidate) => {
    const unknown = Object.keys(candidate).filter(
      (key) => key !== '_id' && !KNOWN_KEYS.includes(key),
    )
    return {
      isValid: unknown.length === 0,
      errors: Object.fromEntries(unknown.map((key) => [key, 'unknown'])),
    }
  },
}

describe('ProjectSettingsImportValidator', () => {
  const validator = new ProjectSettingsImportValidator(stubSchema)

  describe('manifest', () => {
    test('accepts the supported version and a valid timezone', async () => {
      const result = await validator.validate(build())
      expect(result.valid).toBe(true)
      expect(result.data.timezone).toBe('Europe/London')
    })

    test('treats a missing timezone as nothing to apply', async () => {
      const result = await validator.validate(
        build({ manifest: { version: PROJECT_SETTINGS_VERSION } }),
      )
      expect(result.valid).toBe(true)
      expect(result.data.timezone).toBeNull()
    })

    test('rejects an unsupported version', async () => {
      const result = await validator.validate(
        build({ manifest: { version: '9.9' } }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toMatchObject({
        part: 'manifest',
        path: 'version',
      })
    })

    test('rejects an unknown timezone', async () => {
      const result = await validator.validate(
        build({
          manifest: {
            version: PROJECT_SETTINGS_VERSION,
            timezone: 'Mars/Base',
          },
        }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors[0].part).toBe('timezone')
    })

    test('rejects a non-object manifest', async () => {
      const result = await validator.validate(build({ manifest: [] }))
      expect(result.valid).toBe(false)
    })
  })

  describe('settings', () => {
    test('accepts valid settings and strips audit fields', async () => {
      const result = await validator.validate(
        build({
          settings: {
            language: { default: 'de', options: ['de', 'en'] },
            access: { open: false },
          },
        }),
      )
      expect(result.valid).toBe(true)
      expect(result.data.settings?.language).toEqual({
        default: 'de',
        options: ['de', 'en'],
      })
      for (const key of [
        '_id',
        'createdAt',
        'updatedAt',
        'schedule',
        'stats',
      ]) {
        expect(result.data.settings).not.toHaveProperty(key)
      }
    })

    test('drops excluded keys with a warning', async () => {
      const result = await validator.validate(
        build({
          settings: {
            language: { default: 'en', options: ['en'] },
            schedule: { start: '2030-01-01T00:00:00.000Z', end: null },
          },
        }),
      )
      expect(result.valid).toBe(true)
      expect(result.data.settings).not.toHaveProperty('schedule')
      expect(result.warnings.join(' ')).toContain('schedule')
    })

    test('rejects unknown keys', async () => {
      const result = await validator.validate(
        build({ settings: { notASetting: true } }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors[0].part).toBe('settings')
    })

    test('reports a schema that throws as a settings error', async () => {
      const throwing = new ProjectSettingsImportValidator({
        validate: async () => {
          throw new Error('Validate field failed')
        },
      })
      const result = await throwing.validate(
        build({ settings: { language: { default: 'en', options: ['en'] } } }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors[0].part).toBe('settings')
    })

    test('removes script tags from per-language HTML and warns', async () => {
      const result = await validator.validate(
        build({
          settings: {
            dataPolicy: { text: { en: '<p>Hi</p><script>alert(1)</script>' } },
          },
        }),
      )
      expect(result.valid).toBe(true)
      const text = (
        result.data.settings?.dataPolicy as {
          text: Record<string, string>
        }
      ).text.en
      expect(text).not.toContain('script')
      expect(result.warnings.join(' ')).toContain('dataPolicy.text.en')
    })

    test('warns when risky content formats are enabled', async () => {
      const result = await validator.validate(
        build({
          settings: {
            contentFormat: { scriptTagsAllowed: true, htmlAllowed: true },
          },
        }),
      )
      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(2)
    })

    test('rejects a non-object settings file', async () => {
      const result = await validator.validate(build({ settings: 'nope' }))
      expect(result.valid).toBe(false)
    })
  })

  describe('templates', () => {
    const template = {
      type: 'invite',
      lang: 'en',
      subject: 'Hello',
      body: '<p>Body</p>',
    }

    test('accepts valid templates', async () => {
      const result = await validator.validate(build({ templates: [template] }))
      expect(result.valid).toBe(true)
      expect(result.data.templates).toEqual([template])
    })

    test.each([
      ['unknown type', { ...template, type: 'team-invite' }],
      ['overlong language', { ...template, lang: 'eng1' }],
      ['non-string subject', { ...template, subject: 5 }],
      ['non-object entry', 'x'],
    ])('rejects %s', async (_name, entry) => {
      const result = await validator.validate(build({ templates: [entry] }))
      expect(result.valid).toBe(false)
      expect(result.errors[0].part).toBe('templates')
    })

    test('rejects duplicates of the same type and language', async () => {
      const result = await validator.validate(
        build({ templates: [template, template] }),
      )
      expect(result.valid).toBe(false)
    })
  })
})

describe('ProjectSettingsImportValidator with the real SettingSurvey schema', () => {
  // The global fake Date reports itself as "ClockDate", which the schema's
  // date caster rejects, so the schema is built after real timers are restored.
  let validator: ProjectSettingsImportValidator
  beforeAll(() => {
    jest.useRealTimers()
    const schema = new SchemaSettingSurvey()
    schema.addSchemas([
      new SchemaL10n(),
      new SchemaL10nHtml(),
      new SchemaL10nUrl(),
    ])
    validator = new ProjectSettingsImportValidator(schema)
  })
  afterAll(() => jest.useFakeTimers())

  test('accepts a realistic settings document', async () => {
    const result = await validator.validate(
      build({
        settings: {
          language: { default: 'de', options: ['de', 'en'] },
          presentation: { format: 'question', navDelay: 2 },
          dataPolicy: {
            show: true,
            text: { en: '<p>Policy</p>' },
            url: { en: 'https://example.com/policy' },
          },
        },
      }),
    )
    expect(result.errors).toEqual([])
    expect(result.data.settings).toMatchObject({
      language: { default: 'de', options: ['de', 'en'] },
      presentation: { format: 'question', navDelay: 2 },
    })
  })

  test('rejects an unknown key', async () => {
    const result = await validator.validate(
      build({ settings: { notASetting: true } }),
    )
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatchObject({
      part: 'settings',
      path: 'notASetting',
    })
  })

  test('rejects a value outside the allowed set', async () => {
    const result = await validator.validate(
      build({ settings: { presentation: { format: 'sideways' } } }),
    )
    expect(result.valid).toBe(false)
    expect(result.errors[0].path).toBe('presentation.format')
  })
})
