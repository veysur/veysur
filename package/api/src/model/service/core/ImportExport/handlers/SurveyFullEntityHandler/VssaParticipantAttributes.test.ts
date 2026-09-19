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

describe('VSSA participant attributes', () => {
  const surveyId = 'survey-1'
  const projectId = 'project-1'

  describe('VssaImportParser', () => {
    let parser: VssaImportParser

    beforeEach(() => {
      parser = new VssaImportParser()
    })

    test('extracts participant attributes from participantAttributes/*.json entries', async () => {
      const reader = buildReader({
        'survey.json': {
          version: '2.0',
          survey: { _id: surveyId },
          sections: [],
          elements: [],
        },
        'participantAttributes/company.json': {
          name: 'company',
          required: true,
          example: 'Acme Inc',
          languages: { en: { label: 'Company', description: 'Employer name' } },
        },
        'participantAttributes/department.json': {
          name: 'department',
          required: false,
          languages: {},
        },
      })
      const formatHandler = { parse: jest.fn().mockResolvedValue(reader) }

      const result = await parser.parse(
        undefined,
        formatHandler as unknown as Parameters<VssaImportParser['parse']>[1],
      )

      expect(result.participantAttributes).toHaveLength(2)
      expect(result.participantAttributes.map((a) => a.name).sort()).toEqual([
        'company',
        'department',
      ])
    })

    test('yields an empty array when the archive has no participantAttributes/ directory (backward compat)', async () => {
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

      expect(result.participantAttributes).toEqual([])
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
          participantAttributes: [
            {
              name: 'company',
              required: true,
              example: 'Acme Inc',
              languages: {
                en: { label: 'Company', description: 'Employer name' },
              },
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

    test('includes a participantAttributes/{name}.json entry per attribute', async () => {
      const { entries } = await collector.collect(surveyId, {
        projectId,
        aclConditions: { projectAdmin: [projectId] },
        aclContext: {},
      })

      const attributeEntry = entries.find(
        (e) => e.filename === 'participantAttributes/company.json',
      )
      expect(attributeEntry).toBeDefined()
      expect('content' in attributeEntry).toBe(true)
      expect(
        JSON.parse((attributeEntry as { content: string }).content),
      ).toMatchObject({
        name: 'company',
        required: true,
        example: 'Acme Inc',
      })
    })

    test('omits participantAttributes entries when the survey handler returns none', async () => {
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

      expect(
        entries.some((e) => e.filename.startsWith('participantAttributes/')),
      ).toBe(false)
    })
  })
})
