import { PropsOf } from '@datacapy/schema'

import { EmailTemplate } from './EmailTemplate'

/**
 * Immutable collection of email templates
 *
 * Templates are keyed by `${type}-${lang}` (e.g., "invite-en", "reminder-fr")
 */
export class EmailTemplateCollection {
  private readonly templates: Map<string, EmailTemplate>

  constructor(templates?: Map<string, EmailTemplate>) {
    this.templates = templates || new Map()
  }

  /**
   * Create a template key from type and language
   */
  private static makeKey(type: string, lang: string): string {
    return `${type}-${lang}`
  }

  /**
   * Get an email template by key
   *
   * @param key - The template key (e.g., "invite-en")
   * @returns The template or null if not found
   */
  getByKey(key: string): EmailTemplate | null {
    return this.templates.get(key) ?? null
  }

  /**
   * Get an email template by type and language
   *
   * @param type - The template type
   * @param lang - The language code
   * @returns The template or null if not found
   */
  get(type: string, lang: string): EmailTemplate | null {
    const key = EmailTemplateCollection.makeKey(type, lang)
    return this.templates.get(key) ?? null
  }

  /**
   * Get all templates as a Map
   *
   * @returns A copy of the templates Map
   */
  getAll(): Map<string, EmailTemplate> {
    return new Map(this.templates)
  }

  /**
   * Get all templates as an array
   *
   * @returns Array of all templates
   */
  toArray(): EmailTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Check if a template exists
   *
   * @param type - The template type
   * @param lang - The language code
   * @returns True if template exists
   */
  has(type: string, lang: string): boolean {
    const key = EmailTemplateCollection.makeKey(type, lang)
    return this.templates.has(key)
  }

  /**
   * Get the number of templates in the collection
   *
   * @returns Number of templates
   */
  size(): number {
    return this.templates.size
  }

  /**
   * Check if the collection is empty
   *
   * @returns True if no templates exist
   */
  isEmpty(): boolean {
    return this.templates.size === 0
  }

  /**
   * Set or update an email template
   * Returns a new collection instance (immutable)
   *
   * @param type - The template type (e.g., 'invite', 'reminder')
   * @param lang - The language code (e.g., 'en', 'fr')
   * @param template - The template to set
   * @returns New collection instance with the template added/updated
   */
  set(
    type: string,
    lang: string,
    template: EmailTemplate,
  ): EmailTemplateCollection {
    const key = EmailTemplateCollection.makeKey(type, lang)
    const newTemplates = new Map(this.templates)
    newTemplates.set(key, template)
    return new EmailTemplateCollection(newTemplates)
  }

  /**
   * Delete an email template (revert to default)
   * Returns a new collection instance (immutable)
   *
   * @param type - The template type
   * @param lang - The language code
   * @returns New collection instance with the template removed
   */
  delete(type: string, lang: string): EmailTemplateCollection {
    const key = EmailTemplateCollection.makeKey(type, lang)
    const newTemplates = new Map(this.templates)
    newTemplates.delete(key)
    return new EmailTemplateCollection(newTemplates)
  }

  /**
   * Update a template with partial data
   * Returns a new collection instance (immutable)
   *
   * @param data - Partial template data including type and lang to identify the template
   * @returns New collection instance with the template updated
   */
  update(
    data: Partial<PropsOf<EmailTemplate>> & {
      type: string
      lang: string
    },
  ): EmailTemplateCollection {
    const { type, lang, ...updates } = data
    const key = EmailTemplateCollection.makeKey(type, lang)
    const existingTemplate = this.templates.get(key)

    if (!existingTemplate) {
      // If template doesn't exist, create a new one
      const newTemplate = new EmailTemplate(data)
      return this.set(type, lang, newTemplate)
    }

    // Merge updates with existing template
    const updatedTemplate = new EmailTemplate({
      ...existingTemplate,
      ...updates,
      type,
      lang,
      updatedAt: new Date(),
    })

    return this.set(type, lang, updatedTemplate)
  }

  /**
   * Merge this collection with another collection
   * Templates from the other collection take precedence
   *
   * @param other - Collection to merge with
   * @returns New collection instance with merged templates
   */
  merge(other: EmailTemplateCollection): EmailTemplateCollection {
    const newTemplates = new Map(this.templates)
    for (const [key, template] of other.templates) {
      newTemplates.set(key, template)
    }
    return new EmailTemplateCollection(newTemplates)
  }

  /**
   * Create collection from an array of templates
   *
   * @param templates - Array of templates
   * @returns New collection instance
   */
  static fromArray(
    templates: EmailTemplate[] | PropsOf<EmailTemplate>[],
  ): EmailTemplateCollection {
    const templatesMap = new Map<string, EmailTemplate>()

    for (const template of templates) {
      const templateInstance =
        template instanceof EmailTemplate
          ? template
          : new EmailTemplate(template)

      const key = EmailTemplateCollection.makeKey(
        templateInstance.type,
        templateInstance.lang,
      )
      templatesMap.set(key, templateInstance)
    }

    return new EmailTemplateCollection(templatesMap)
  }

  /**
   * Create collection from a Map
   * Handles deserialization from React Query cache where Map may be plain object
   *
   * @param data - Map or plain object to convert
   * @returns New collection instance
   */
  static fromMap(
    data: Map<string, EmailTemplate> | Record<string, unknown>,
  ): EmailTemplateCollection {
    // If it's already a Map, use it directly
    if (data instanceof Map) {
      // Ensure values are proper EmailTemplate instances
      const templatesMap = new Map<string, EmailTemplate>()
      for (const [key, value] of data.entries()) {
        const template =
          value instanceof EmailTemplate ? value : new EmailTemplate(value)
        templatesMap.set(key, template)
      }
      return new EmailTemplateCollection(templatesMap)
    }

    // If it's a plain object (deserialized from cache), convert it
    const templatesMap = new Map<string, EmailTemplate>()
    for (const [key, value] of Object.entries(data)) {
      const template =
        value instanceof EmailTemplate
          ? value
          : new EmailTemplate(value as PropsOf<EmailTemplate>)
      templatesMap.set(key, template)
    }
    return new EmailTemplateCollection(templatesMap)
  }
}
