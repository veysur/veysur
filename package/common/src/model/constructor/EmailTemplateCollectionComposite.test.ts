import { EmailTemplate } from './EmailTemplate'
import { EmailTemplateCollection } from './EmailTemplateCollection'
import { EmailTemplateCollectionComposite } from './EmailTemplateCollectionComposite'

describe('EmailTemplateCollectionComposite', () => {
  // Helper function to create test templates
  const createTemplate = (
    type: string,
    lang: string,
    marker = 'project1',
    surveyId: string | null = null,
  ): EmailTemplate => {
    return new EmailTemplate({
      surveyId,
      type,
      lang,
      subject: `${type} ${lang} ${marker} subject`,
      body: `${type} ${lang} body`,
    })
  }

  describe('getTemplate', () => {
    test('returns survey-level template when available (highest priority)', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const surveyTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'project1', 'survey1'),
      ])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getTemplate({ type: 'invite', lang: 'en' })
      expect(template).toBeDefined()
      expect(template?.surveyId).toBe('survey1')
    })

    test('returns project-level template when survey template not available', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'project1'),
      ])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getTemplate({ type: 'invite', lang: 'en' })
      expect(template).toBeDefined()
      expect(template?.surveyId).toBeNull()
      expect(template?.subject).toContain('project1')
    })

    test('returns system-level template when survey and project templates not available', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'system'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getTemplate({ type: 'invite', lang: 'en' })
      expect(template).toBeDefined()
      expect(template?.subject).toContain('system')
    })

    test('falls back to project default language when requested language not found', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'es'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'es',
      })

      const template = composite.getTemplate({ type: 'invite', lang: 'fr' })
      expect(template).toBeDefined()
      expect(template?.lang).toBe('es')
    })

    test('falls back to English when requested language and project default not found', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'es',
      })

      const template = composite.getTemplate({ type: 'invite', lang: 'fr' })
      expect(template).toBeDefined()
      expect(template?.lang).toBe('en')
    })

    test('returns null when no template found in any tier or language', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getTemplate({ type: 'invite', lang: 'fr' })
      expect(template).toBeNull()
    })

    test('does not fall back to project default when requested language is same as project default', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getTemplate({ type: 'invite', lang: 'en' })
      expect(template).toBeDefined()
      expect(template?.lang).toBe('en')
    })

    test('does not fall back to English when already tried as project default', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getTemplate({ type: 'invite', lang: 'fr' })
      expect(template).toBeNull()
    })

    test('does not fall back to English when already requested', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'es',
      })

      const template = composite.getTemplate({ type: 'invite', lang: 'en' })
      expect(template).toBeNull()
    })
  })

  describe('getDefaultTemplate', () => {
    test('returns project template for survey context when available', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'project1'),
      ])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getDefaultTemplate({
        type: 'invite',
        lang: 'en',
        context: 'survey',
      })
      expect(template).toBeDefined()
      expect(template?.subject).toContain('project1')
    })

    test('falls back to system template for survey context when project template not available', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'system'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getDefaultTemplate({
        type: 'invite',
        lang: 'en',
        context: 'survey',
      })
      expect(template).toBeDefined()
      expect(template?.subject).toContain('system')
    })

    test('returns system template for project context', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'system'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getDefaultTemplate({
        type: 'invite',
        lang: 'en',
        context: 'project',
      })
      expect(template).toBeDefined()
      expect(template?.subject).toContain('system')
    })

    test('applies language fallback for survey context', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'system'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'es',
      })

      const template = composite.getDefaultTemplate({
        type: 'invite',
        lang: 'fr',
        context: 'survey',
      })
      expect(template).toBeDefined()
      expect(template?.lang).toBe('en')
    })

    test('applies language fallback for project context', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'es', 'system'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'es',
      })

      const template = composite.getDefaultTemplate({
        type: 'invite',
        lang: 'fr',
        context: 'project',
      })
      expect(template).toBeDefined()
      expect(template?.lang).toBe('es')
    })

    test('defaults to survey context when context not specified', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'system'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'project1'),
      ])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getDefaultTemplate({
        type: 'invite',
        lang: 'en',
      })
      expect(template).toBeDefined()
      expect(template?.subject).toContain('project1')
    })

    test('returns null when no default template found', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      const template = composite.getDefaultTemplate({
        type: 'invite',
        lang: 'fr',
        context: 'survey',
      })
      expect(template).toBeNull()
    })
  })

  describe('hasTemplate', () => {
    test('returns true when template exists at any tier', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      expect(composite.hasTemplate('invite', 'en')).toBe(true)
    })

    test('returns true when template found through language fallback', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'es',
      })

      expect(composite.hasTemplate('invite', 'fr')).toBe(true)
    })

    test('returns false when template not found', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      expect(composite.hasTemplate('invite', 'en')).toBe(false)
    })
  })

  describe('getTemplateTier', () => {
    test('returns "survey" when template exists at survey level', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const surveyTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'project1', 'survey1'),
      ])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      expect(composite.getTemplateTier('invite', 'en')).toBe('survey')
    })

    test('returns "project" when template exists at project level only', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'project1'),
      ])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      expect(composite.getTemplateTier('invite', 'en')).toBe('project')
    })

    test('returns "system" when template exists at system level only', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      expect(composite.getTemplateTier('invite', 'en')).toBe('system')
    })

    test('returns null when template does not exist', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      expect(composite.getTemplateTier('invite', 'en')).toBeNull()
    })

    test('checks exact language match, not fallback languages', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'es',
      })

      // Even though 'fr' would fallback to 'en', getTemplateTier checks exact match
      expect(composite.getTemplateTier('invite', 'fr')).toBeNull()
    })
  })

  describe('getter methods', () => {
    test('getSystemTemplates returns system templates collection', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      expect(composite.getSystemTemplates()).toBe(systemTemplates)
    })

    test('getProjectTemplates returns project templates collection', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
      ])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      expect(composite.getProjectTemplates()).toBe(projectTemplates)
    })

    test('getSurveyTemplates returns survey templates collection', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'project1', 'survey1'),
      ])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      expect(composite.getSurveyTemplates()).toBe(surveyTemplates)
    })

    test('getProjectDefaultLang returns project default language', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'es',
      })

      expect(composite.getProjectDefaultLang()).toBe('es')
    })

    test('getProjectDefaultLang defaults to "en" when not specified', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
      })

      expect(composite.getProjectDefaultLang()).toBe('en')
    })
  })

  describe('complex scenarios', () => {
    test('resolves correctly with multiple template types and languages', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en'),
        createTemplate('invite', 'fr'),
        createTemplate('reminder', 'en'),
        createTemplate('reminder', 'es'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'fr', 'project1'),
      ])
      const surveyTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'en', 'project1', 'survey1'),
      ])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      // Survey override
      expect(
        composite.getTemplate({ type: 'invite', lang: 'en' })?.surveyId,
      ).toBe('survey1')

      // Project override
      expect(
        composite.getTemplate({ type: 'invite', lang: 'fr' })?.surveyId,
      ).toBeNull()
      expect(
        composite.getTemplate({ type: 'invite', lang: 'fr' })?.subject,
      ).toContain('project1')

      // System template
      expect(
        composite.getTemplate({ type: 'reminder', lang: 'en' })?.subject,
      ).toContain('project1')
    })

    test('handles empty collections gracefully', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'en',
      })

      expect(composite.getTemplate({ type: 'invite', lang: 'en' })).toBeNull()
      expect(composite.hasTemplate('invite', 'en')).toBe(false)
      expect(composite.getTemplateTier('invite', 'en')).toBeNull()
      expect(
        composite.getDefaultTemplate({ type: 'invite', lang: 'en' }),
      ).toBeNull()
    })

    test('language fallback chain works correctly', () => {
      const systemTemplates = EmailTemplateCollection.fromArray([
        createTemplate('invite', 'de'),
        createTemplate('reminder', 'es'),
        createTemplate('welcome', 'en'),
      ])
      const projectTemplates = EmailTemplateCollection.fromArray([])
      const surveyTemplates = EmailTemplateCollection.fromArray([])

      const composite = new EmailTemplateCollectionComposite({
        systemTemplates,
        projectTemplates,
        surveyTemplates,
        projectDefaultLang: 'de',
      })

      // Request 'fr', fallback to project default 'de'
      expect(composite.getTemplate({ type: 'invite', lang: 'fr' })?.lang).toBe(
        'de',
      )

      // Request 'fr', project default 'de' doesn't exist, fallback to 'en'
      expect(composite.getTemplate({ type: 'welcome', lang: 'fr' })?.lang).toBe(
        'en',
      )

      // Request 'fr', no fallback available (de and en don't exist for reminder)
      expect(composite.getTemplate({ type: 'unknown', lang: 'fr' })).toBeNull()
    })
  })
})
