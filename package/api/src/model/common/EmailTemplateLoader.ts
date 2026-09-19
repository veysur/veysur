import * as fs from 'fs'
import * as path from 'path'
import { EmailTemplate } from 'veysur-common'

/**
 * SystemEmailTemplateLoader - Singleton loader for system-wide email templates
 *
 * Loads email templates from JSON files in the assets/templates/email/system directory.
 * Templates are cached in memory after first load for performance.
 *
 * Template files are organized by language:
 * - model/asset/email-template/system/en/invite.json
 * - model/asset/email-template/system/en/reminder.json
 * - etc.
 */
export class SystemEmailTemplateLoader {
  private static instance: SystemEmailTemplateLoader | null = null
  private templateCache: Map<string, EmailTemplate> = new Map()
  private readonly templatesDir: string

  private constructor() {
    // Get the path to the templates directory in assets
    this.templatesDir = path.join(__dirname, '../asset/email-template/system')
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SystemEmailTemplateLoader {
    if (!SystemEmailTemplateLoader.instance) {
      SystemEmailTemplateLoader.instance = new SystemEmailTemplateLoader()
    }
    return SystemEmailTemplateLoader.instance
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    SystemEmailTemplateLoader.instance = null
  }

  /**
   * Create cache key from type and language
   */
  private makeKey(type: string, lang: string): string {
    return `${type}-${lang}`
  }

  /**
   * Load a template from file system
   */
  private loadTemplateFromFile(
    type: string,
    lang: string,
  ): EmailTemplate | null {
    try {
      const filePath = path.join(this.templatesDir, lang, `${type}.json`)

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return null
      }

      // Read and parse JSON file
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const templateData = JSON.parse(fileContent)

      // Validate required fields
      if (
        !templateData.type ||
        !templateData.lang ||
        !templateData.subject ||
        !templateData.body
      ) {
        console.warn(`Invalid template file: ${filePath}`)
        return null
      }

      // Create EmailTemplate instance with null surveyId (system-level)
      const template = new EmailTemplate({
        surveyId: null as unknown as string, // System templates don't belong to a survey
        type: templateData.type,
        lang: templateData.lang,
        subject: templateData.subject,
        body: templateData.body,
      })

      return template
    } catch (error) {
      console.error(`Error loading template ${type}-${lang}:`, error)
      return null
    }
  }

  /**
   * Get a single template by type and language
   * Returns cached version if available, otherwise loads from file
   *
   * @param type - Template type (invite, reminder, etc.)
   * @param lang - Language code (en, fr, etc.)
   * @returns EmailTemplate or null if not found
   */
  getTemplate(type: string, lang: string): EmailTemplate | null {
    const key = this.makeKey(type, lang)

    // Check cache first
    if (this.templateCache.has(key)) {
      return this.templateCache.get(key) || null
    }

    // Load from file and cache
    const template = this.loadTemplateFromFile(type, lang)
    if (template) {
      this.templateCache.set(key, template)
    }

    return template
  }

  /**
   * Get all templates for a specific language
   *
   * @param lang - Language code (en, fr, etc.)
   * @returns Array of EmailTemplates for the language
   */
  getTemplatesByLanguage(lang: string): EmailTemplate[] {
    const langDir = path.join(this.templatesDir, lang)

    // Check if language directory exists
    if (!fs.existsSync(langDir)) {
      return []
    }

    // Read all JSON files in the language directory
    const files = fs
      .readdirSync(langDir)
      .filter((file) => file.endsWith('.json'))

    const templates: EmailTemplate[] = []
    for (const file of files) {
      const type = path.basename(file, '.json')
      const template = this.getTemplate(type, lang)
      if (template) {
        templates.push(template)
      }
    }

    return templates
  }

  /**
   * Get all available templates across all languages
   *
   * @returns Array of all EmailTemplates
   */
  getAllTemplates(): EmailTemplate[] {
    const templates: EmailTemplate[] = []

    // Check if templates directory exists
    if (!fs.existsSync(this.templatesDir)) {
      console.warn(`Templates directory not found: ${this.templatesDir}`)
      return templates
    }

    // Read all language directories
    const langDirs = fs.readdirSync(this.templatesDir).filter((item) => {
      const itemPath = path.join(this.templatesDir, item)
      return fs.statSync(itemPath).isDirectory()
    })

    // Load templates from each language directory
    for (const lang of langDirs) {
      const langTemplates = this.getTemplatesByLanguage(lang)
      templates.push(...langTemplates)
    }

    return templates
  }

  /**
   * Get list of available languages
   *
   * @returns Array of language codes
   */
  getAvailableLanguages(): string[] {
    if (!fs.existsSync(this.templatesDir)) {
      return []
    }

    return fs.readdirSync(this.templatesDir).filter((item) => {
      const itemPath = path.join(this.templatesDir, item)
      return fs.statSync(itemPath).isDirectory()
    })
  }

  /**
   * Clear the template cache
   * Useful for testing or hot-reloading templates
   */
  clearCache(): void {
    this.templateCache.clear()
  }
}

export default SystemEmailTemplateLoader
