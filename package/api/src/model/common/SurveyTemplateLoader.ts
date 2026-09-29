import * as fs from 'fs'
import * as path from 'path'

import { parseMarkdownSurvey } from '../service/core/ImportExport/handlers/SurveyEntityHandler/MarkdownSurveyParser'

export type SurveyTemplateSummary = {
  id: string
  name: string
  description: string
  category: string
  questionCount: number
}

type LoadedSurveyTemplate = SurveyTemplateSummary & { markdown: string }

const FRONT_MATTER_DELIMITER = '---'

/**
 * Singleton loader for the built-in survey templates in
 * `model/asset/survey-template/<id>.md`. Each file is a survey markdown
 * document (see docs/import-export/survey-markdown-format.md) whose front
 * matter also carries a required `templateName` and `templateDescription`,
 * which the markdown parser ignores. The id is the filename without `.md`.
 */
export class SurveyTemplateLoader {
  private static instance: SurveyTemplateLoader | null = null
  private templates: Map<string, LoadedSurveyTemplate> | null = null

  private constructor(private readonly templatesDir: string) {}

  static getInstance(): SurveyTemplateLoader {
    if (!SurveyTemplateLoader.instance) {
      SurveyTemplateLoader.instance = new SurveyTemplateLoader(
        path.join(__dirname, '../asset/survey-template'),
      )
    }
    return SurveyTemplateLoader.instance
  }

  static resetInstance(): void {
    SurveyTemplateLoader.instance = null
  }

  static forDirectory(templatesDir: string): SurveyTemplateLoader {
    return new SurveyTemplateLoader(templatesDir)
  }

  list(): SurveyTemplateSummary[] {
    return [...this.load().values()].map(
      ({ id, name, description, category, questionCount }) => ({
        id,
        name,
        description,
        category,
        questionCount,
      }),
    )
  }

  /** Returns null for an id that is not a shipped template, never touching the filesystem with it. */
  getMarkdown(id: string): string | null {
    return this.load().get(id)?.markdown ?? null
  }

  private load(): Map<string, LoadedSurveyTemplate> {
    if (this.templates) return this.templates

    const loaded = fs
      .readdirSync(this.templatesDir)
      .filter((file) => file.endsWith('.md'))
      .sort()
      .map((file) => this.readTemplate(file))
      .sort((a, b) => a.name.localeCompare(b.name))

    this.templates = new Map(loaded.map((template) => [template.id, template]))
    return this.templates
  }

  private readTemplate(file: string): LoadedSurveyTemplate {
    const id = file.slice(0, -'.md'.length)
    const markdown = fs.readFileSync(path.join(this.templatesDir, file), 'utf8')
    const frontMatter = this.readFrontMatter(markdown)

    const name = frontMatter.templateName
    const description = frontMatter.templateDescription
    if (!name) {
      throw new Error(`Survey template '${id}' is missing 'templateName'`)
    }
    if (!description) {
      throw new Error(
        `Survey template '${id}' is missing 'templateDescription'`,
      )
    }
    const category = frontMatter.templateCategory
    if (!category) {
      throw new Error(`Survey template '${id}' is missing 'templateCategory'`)
    }
    const questionCount = parseMarkdownSurvey(markdown).elements.filter(
      (element) => element.kind !== 'content',
    ).length
    return { id, name, description, category, questionCount, markdown }
  }

  private readFrontMatter(markdown: string): Record<string, string> {
    const lines = markdown.split('\n')
    if (lines[0] !== FRONT_MATTER_DELIMITER) return {}
    const close = lines.indexOf(FRONT_MATTER_DELIMITER, 1)
    if (close === -1) return {}

    const values: Record<string, string> = {}
    for (const line of lines.slice(1, close)) {
      const match = /^(\w+):\s*(.*)$/.exec(line)
      if (match) values[match[1]] = this.unquote(match[2].trim())
    }
    return values
  }

  private unquote(value: string): string {
    const quoted = /^(["'])(.*)\1$/.exec(value)
    return quoted ? quoted[2] : value
  }
}
