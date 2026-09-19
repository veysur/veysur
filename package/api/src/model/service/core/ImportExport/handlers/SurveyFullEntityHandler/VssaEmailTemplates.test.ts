// cspell:ignore Bonjour
import type { RepoSurveyPublication } from 'model'
import { VssaExportCollector } from './VssaExportCollector'
import { VssaImportParser } from './VssaImportParser'
import { ArchiveReader } from '../../format/ArchiveReader'
import { SurveyEntityHandler } from '../SurveyEntityHandler'
import { SurveyPublicationEntityHandler } from '../SurveyPublicationEntityHandler'

function buildReader(entries: Record<string, unknown>): ArchiveReader {
  const reader = new ArchiveReader(undefined, undefined)
  for (const [name, data] of Object.entries(entries)) {
    reader.setJson(name, data)
  }
  return reader
}

describe('VSSA email templates', () => {
  const surveyId = 'survey-1'
  const projectId = 'project-1'

  describe('VssaImportParser', () => {
    let parser: VssaImportParser

    beforeEach(() => {
      parser = new VssaImportParser()
    })

    test('extracts email templates from templates/*.json entries', async () => {
      const reader = buildReader({
        'survey.json': {
          version: '2.0',
          survey: { _id: surveyId },
          sections: [],
          elements: [],
        },
        'templates/invite-en.json': {
          type: 'invite',
          lang: 'en',
          subject: 'Please take our survey',
          body: '<p>Hi</p>',
        },
        'templates/reminder-fr.json': {
          type: 'reminder',
          lang: 'fr',
          subject: 'Rappel',
          body: '<p>Bonjour</p>',
        },
      })
      const formatHandler = { parse: jest.fn().mockResolvedValue(reader) }

      const result = await parser.parse(
        undefined,
        formatHandler as unknown as Parameters<VssaImportParser['parse']>[1],
      )

      expect(result.emailTemplates).toHaveLength(2)
      expect(
        result.emailTemplates.map((t) => `${t.type}-${t.lang}`).sort(),
      ).toEqual(['invite-en', 'reminder-fr'])
    })

    test('yields an empty array when the archive has no templates/ directory (backward compat)', async () => {
      const reader = buildReader({
        'survey.json': {
          version: '2.0',
          survey: { _id: surveyId },
          sections: [],
          elements: [],
        },
      })
      const formatHandler = { parse: jest.fn().mockResolvedValue(reader) }

      const result = await parser.parse(
        undefined,
        formatHandler as unknown as Parameters<VssaImportParser['parse']>[1],
      )

      expect(result.emailTemplates).toEqual([])
    })
  })

  describe('VssaExportCollector', () => {
    let mockRepoSurveyPublication: { find: jest.Mock }
    let mockSurveyHandler: { fetchForExport: jest.Mock }
    let mockPubHandler: { fetchForExport: jest.Mock }
    let collector: VssaExportCollector

    const SURVEY = {
      _id: surveyId,
      projectId,
      applySortOrder: () => ({
        _id: surveyId,
        projectId,
        sections: [],
        elements: [],
      }),
    }

    beforeEach(() => {
      mockRepoSurveyPublication = { find: jest.fn().mockResolvedValue([]) }
      mockSurveyHandler = {
        fetchForExport: jest.fn().mockResolvedValue({
          survey: SURVEY,
          surveyLanguages: [],
          embeddedFileEntries: [],
          emailTemplates: [
            {
              type: 'invite',
              lang: 'en',
              subject: 'Please take our survey',
              body: '<p>Hi</p>',
            },
          ],
        }),
      }
      mockPubHandler = { fetchForExport: jest.fn() }

      collector = new VssaExportCollector(
        mockRepoSurveyPublication as unknown as RepoSurveyPublication,
        mockSurveyHandler as unknown as SurveyEntityHandler,
        mockPubHandler as unknown as SurveyPublicationEntityHandler,
      )
    })

    test('includes a templates/{type}-{lang}.json entry per email template', async () => {
      const { entries } = await collector.collect(surveyId, {
        projectId,
        aclConditions: { projectAdmin: [projectId] },
        aclContext: {},
      })

      const templateEntry = entries.find(
        (e) => e.filename === 'templates/invite-en.json',
      )
      expect(templateEntry).toBeDefined()
      expect('content' in templateEntry).toBe(true)
      expect(
        JSON.parse((templateEntry as { content: string }).content),
      ).toMatchObject({
        type: 'invite',
        lang: 'en',
        subject: 'Please take our survey',
      })
    })

    test('omits templates entries when the survey handler returns none', async () => {
      mockSurveyHandler.fetchForExport.mockResolvedValue({
        survey: SURVEY,
        surveyLanguages: [],
        embeddedFileEntries: [],
      })

      const { entries } = await collector.collect(surveyId, {
        projectId,
        aclConditions: { projectAdmin: [projectId] },
        aclContext: {},
      })

      expect(entries.some((e) => e.filename.startsWith('templates/'))).toBe(
        false,
      )
    })
  })
})
