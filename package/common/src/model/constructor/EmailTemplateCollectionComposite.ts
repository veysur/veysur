import { EmailTemplate } from './EmailTemplate'
import { EmailTemplateCollection } from './EmailTemplateCollection'

/**
 * EmailTemplateCollectionComposite - Hierarchical email template resolution
 *
 * Implements a 3-tier template inheritance system:
 * 1. Survey-level templates (highest priority - specific overrides)
 * 2. Project-level templates (medium priority - project defaults)
 * 3. System-level templates (lowest priority - system-wide defaults)
 *
 * Also implements language fallback:
 * - Requested language
 * - Project default language
 * - English ('en')
 *
 * Example resolution for getTemplate({ type: 'invite', lang: 'fr' }):
 * 1. Survey template (invite-fr)
 * 2. Project template (invite-fr)
 * 3. System template (invite-fr)
 * 4. System template (invite-<projectDefaultLang>)
 * 5. System template (invite-en)
 * 6. null
 */
export class EmailTemplateCollectionComposite {
  private readonly systemTemplates: EmailTemplateCollection
  private readonly projectTemplates: EmailTemplateCollection
  private readonly surveyTemplates: EmailTemplateCollection
  private readonly projectDefaultLang: string

  constructor({
    systemTemplates,
    projectTemplates,
    surveyTemplates,
    projectDefaultLang = 'en',
  }: {
    systemTemplates: EmailTemplateCollection
    projectTemplates: EmailTemplateCollection
    surveyTemplates: EmailTemplateCollection
    projectDefaultLang?: string
  }) {
    this.systemTemplates = systemTemplates
    this.projectTemplates = projectTemplates
    this.surveyTemplates = surveyTemplates
    this.projectDefaultLang = projectDefaultLang
  }

  /**
   * Get template with intelligent fallback across tiers and languages
   *
   * Resolution order:
   * 1. Survey template (type, lang)
   * 2. Project template (type, lang)
   * 3. System template (type, lang)
   * 4. System template (type, projectDefaultLang) - if different from requested lang
   * 5. System template (type, 'en') - if not already tried
   * 6. null
   *
   * @param type - Template type (invite, reminder, etc.)
   * @param lang - Requested language code
   * @returns EmailTemplate or null if not found
   */
  getTemplate({
    type,
    lang,
  }: {
    type: string
    lang: string
  }): EmailTemplate | null {
    // 1. Try survey-level override (highest priority)
    const surveyTemplate = this.surveyTemplates.get(type, lang)
    if (surveyTemplate) {
      return surveyTemplate
    }

    // 2. Try project-level default
    const projectTemplate = this.projectTemplates.get(type, lang)
    if (projectTemplate) {
      return projectTemplate
    }

    // 3. Try system template in requested language
    const systemTemplate = this.systemTemplates.get(type, lang)
    if (systemTemplate) {
      return systemTemplate
    }

    // 4. Language fallback: try project's default language (if different)
    if (lang !== this.projectDefaultLang) {
      const systemTemplateDefaultLang = this.systemTemplates.get(
        type,
        this.projectDefaultLang,
      )
      if (systemTemplateDefaultLang) {
        return systemTemplateDefaultLang
      }
    }

    // 5. Final fallback: English (if not already tried)
    if (lang !== 'en' && this.projectDefaultLang !== 'en') {
      const systemTemplateEn = this.systemTemplates.get(type, 'en')
      if (systemTemplateEn) {
        return systemTemplateEn
      }
    }

    // 6. No template found
    return null
  }

  /**
   * Get default template for a given context
   *
   * Survey context: Returns project template (with system fallback)
   * Project context: Returns system template (with language fallback)
   *
   * This is useful for showing "default" values in the UI when the
   * "Use Default" checkbox is checked.
   *
   * @param type - Template type
   * @param lang - Language code
   * @param context - Either 'survey' or 'project'
   * @returns EmailTemplate or null
   */
  getDefaultTemplate({
    type,
    lang,
    context = 'survey',
  }: {
    type: string
    lang: string
    context?: 'survey' | 'project'
  }): EmailTemplate | null {
    if (context === 'survey') {
      // For survey context, default is project template (with system fallback)
      const projectTemplate = this.projectTemplates.get(type, lang)
      if (projectTemplate) {
        return projectTemplate
      }

      // Fallback to system template (with language fallback)
      return this.getSystemTemplateWithLanguageFallback(type, lang)
    }

    // For project context, default is system template (with language fallback)
    return this.getSystemTemplateWithLanguageFallback(type, lang)
  }

  /**
   * Get system template with language fallback
   * Helper method for language fallback logic
   *
   * @param type - Template type
   * @param lang - Language code
   * @returns EmailTemplate or null
   */
  private getSystemTemplateWithLanguageFallback(
    type: string,
    lang: string,
  ): EmailTemplate | null {
    // Try requested language
    const systemTemplate = this.systemTemplates.get(type, lang)
    if (systemTemplate) {
      return systemTemplate
    }

    // Try project default language (if different)
    if (lang !== this.projectDefaultLang) {
      const systemTemplateDefaultLang = this.systemTemplates.get(
        type,
        this.projectDefaultLang,
      )
      if (systemTemplateDefaultLang) {
        return systemTemplateDefaultLang
      }
    }

    // Final fallback: English (if not already tried)
    if (lang !== 'en' && this.projectDefaultLang !== 'en') {
      const systemTemplateEn = this.systemTemplates.get(type, 'en')
      if (systemTemplateEn) {
        return systemTemplateEn
      }
    }

    return null
  }

  /**
   * Check if a template exists at any tier
   *
   * @param type - Template type
   * @param lang - Language code
   * @returns true if template exists at any tier
   */
  hasTemplate(type: string, lang: string): boolean {
    return this.getTemplate({ type, lang }) !== null
  }

  /**
   * Get the tier where a template is defined
   *
   * @param type - Template type
   * @param lang - Language code
   * @returns 'survey' | 'project' | 'system' | null
   */
  getTemplateTier(
    type: string,
    lang: string,
  ): 'survey' | 'project' | 'system' | null {
    if (this.surveyTemplates.has(type, lang)) {
      return 'survey'
    }
    if (this.projectTemplates.has(type, lang)) {
      return 'project'
    }
    if (this.systemTemplates.has(type, lang)) {
      return 'system'
    }
    return null
  }

  /**
   * Get the system templates collection
   */
  getSystemTemplates(): EmailTemplateCollection {
    return this.systemTemplates
  }

  /**
   * Get the project templates collection
   */
  getProjectTemplates(): EmailTemplateCollection {
    return this.projectTemplates
  }

  /**
   * Get the survey templates collection
   */
  getSurveyTemplates(): EmailTemplateCollection {
    return this.surveyTemplates
  }

  /**
   * Get the project default language
   */
  getProjectDefaultLang(): string {
    return this.projectDefaultLang
  }
}

export default EmailTemplateCollectionComposite
