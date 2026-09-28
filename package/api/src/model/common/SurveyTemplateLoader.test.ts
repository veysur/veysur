import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { SurveyImportValidator } from 'veysur-common'

import { SurveyTemplateLoader } from './SurveyTemplateLoader'

import { parseMarkdownSurvey } from '../service/core/ImportExport/handlers/SurveyEntityHandler/MarkdownSurveyParser'

describe('SurveyTemplateLoader (shipped templates)', () => {
  const loader = SurveyTemplateLoader.getInstance()

  test('ships at least one template', () => {
    expect(loader.list().length).toBeGreaterThan(0)
  })

  test.each(loader.list().map((t) => [t.id, t] as const))(
    '%s has a name and description and parses as survey markdown',
    async (id, template) => {
      expect(template.name.trim()).not.toBe('')
      expect(template.description.trim()).not.toBe('')

      const bundle = parseMarkdownSurvey(loader.getMarkdown(id))
      const kinds = bundle.sections.map((s) => s.kind)
      expect(kinds[0]).toBe('welcome')
      expect(kinds[kinds.length - 1]).toBe('thankYou')
      expect(kinds).toContain('group')
      expect(bundle.elements.length).toBeGreaterThan(0)

      const { valid, errors } = await new SurveyImportValidator(false).validate(
        {
          survey: bundle.survey,
          sections: bundle.sections,
          elements: bundle.elements,
        },
      )
      expect(errors).toEqual([])
      expect(valid).toBe(true)
    },
  )

  test('returns null for an unknown id and never reads it from disk', () => {
    expect(loader.getMarkdown('../../etc/passwd')).toBeNull()
    expect(loader.getMarkdown('nope')).toBeNull()
  })
})

describe('SurveyTemplateLoader (custom directory)', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'survey-template-'))
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  const write = (file: string, frontMatter: string) =>
    fs.writeFileSync(path.join(dir, file), `---\n${frontMatter}\n---\n\n# T\n`)

  test('lists templates sorted by name, unquoting front matter values', () => {
    write('b.md', 'templateName: "Beta"\ntemplateDescription: Second one')
    write('a.md', "templateName: 'Zulu'\ntemplateDescription: First one")
    write('ignored.txt', 'templateName: X')

    expect(SurveyTemplateLoader.forDirectory(dir).list()).toEqual([
      { id: 'b', name: 'Beta', description: 'Second one' },
      { id: 'a', name: 'Zulu', description: 'First one' },
    ])
  })

  test('throws when templateName is missing', () => {
    write('a.md', 'templateDescription: Something')
    expect(() => SurveyTemplateLoader.forDirectory(dir).list()).toThrow(
      "'a' is missing 'templateName'",
    )
  })

  test('throws when templateDescription is missing', () => {
    write('a.md', 'templateName: Something')
    expect(() => SurveyTemplateLoader.forDirectory(dir).list()).toThrow(
      "'a' is missing 'templateDescription'",
    )
  })
})
