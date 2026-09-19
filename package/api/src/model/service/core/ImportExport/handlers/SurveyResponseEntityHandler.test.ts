import { Readable } from 'stream'

import type {
  RepoSurveyResponse,
  RepoSurveyParticipant,
  RepoSurveySnapshot,
  RepoSurveyLanguageSnapshot,
} from 'model'
import { SurveyResponse, SurveySnapshot } from 'veysur-common'

import { SurveyResponseEntityHandler } from './SurveyResponseEntityHandler'
import { CsvFormatHandler } from '../format/CsvFormatHandler'
import type { EntityExportContext } from '../EntityHandlerInterface'

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

describe('SurveyResponseEntityHandler', () => {
  const projectId = 'project-1'
  const surveyId = 'survey-1'
  const publicationId = 'publication-1'
  const snapshotId = 'snapshot-1'

  const surveyData = {
    _id: surveyId,
    title: { en: 'Matrix survey' },
    language: { default: 'en' },
    elements: [
      { _id: 'q1', code: 'Q001', type: 'text', text: { en: 'Name' } },
      {
        _id: 'q2',
        code: 'Q002',
        type: 'matrixComposite',
        text: { en: 'Matrix' },
        answerOptions: [
          { _id: 'a1', code: 'R001', label: { en: 'Row 1' } },
          { _id: 'a2', code: 'R002', label: { en: 'Row 2' } },
        ],
        subquestions: [
          { _id: 's1', code: 'C001', type: 'text', text: { en: 'Col 1' } },
        ],
      },
      {
        _id: 'q3',
        code: 'Q003',
        type: 'multiPartText',
        text: { en: 'Multi-Part' },
        subquestions: [
          { _id: 'p1', code: 'P001', type: 'text', text: { en: 'Part 1' } },
          { _id: 'p2', code: 'P002', type: 'text', text: { en: 'Part 2' } },
        ],
      },
    ],
  }

  const checkboxSurveyData = {
    _id: surveyId,
    title: { en: 'Checkbox survey' },
    language: { default: 'en' },
    elements: [
      { _id: 'q1', code: 'Q001', type: 'text', text: { en: 'Name' } },
      {
        _id: 'q4',
        code: 'Q004',
        type: 'checkbox',
        text: { en: 'Fruit' },
        answerOptions: [
          { _id: 'a3', code: 'F001', label: { en: 'Apple' } },
          { _id: 'a4', code: 'F002', label: { en: 'Pear' } },
        ],
      },
    ],
  }

  const matrixCheckboxSurveyData = {
    _id: surveyId,
    title: { en: 'Matrix checkbox survey' },
    language: { default: 'en' },
    elements: [
      { _id: 'q1', code: 'Q001', type: 'text', text: { en: 'Name' } },
      {
        _id: 'q5',
        code: 'Q005',
        type: 'matrixCheckbox',
        text: { en: 'Preferences' },
        answerOptions: [
          { _id: 'a5', code: 'X001', label: { en: 'Cheese' } },
          { _id: 'a6', code: 'X002', label: { en: 'Tomato' } },
        ],
        subquestions: [
          { _id: 's2', code: 'D001', type: 'checkbox', text: { en: 'Day 1' } },
        ],
      },
    ],
  }

  let mockRepoSurveyResponse: { find: jest.Mock; insertOne: jest.Mock }
  let mockRepoSurveyParticipant: { findOne: jest.Mock; create: jest.Mock }
  let mockRepoSurveySnapshot: { findOne: jest.Mock }
  let mockRepoSurveyLanguageSnapshot: { find: jest.Mock }
  let handler: SurveyResponseEntityHandler

  beforeEach(() => {
    mockRepoSurveyResponse = {
      find: jest.fn().mockResolvedValue([]),
      insertOne: jest.fn().mockResolvedValue(undefined),
    }
    mockRepoSurveyParticipant = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
    }
    mockRepoSurveySnapshot = {
      findOne: jest.fn().mockResolvedValue({ survey: surveyData }),
    }
    mockRepoSurveyLanguageSnapshot = {
      find: jest.fn().mockResolvedValue([]),
    }

    handler = new SurveyResponseEntityHandler(
      mockRepoSurveyResponse as unknown as RepoSurveyResponse,
      mockRepoSurveyParticipant as unknown as RepoSurveyParticipant,
      mockRepoSurveySnapshot as unknown as RepoSurveySnapshot,
      mockRepoSurveyLanguageSnapshot as unknown as RepoSurveyLanguageSnapshot,
    )
  })

  test('exports matrix cell columns keyed subquestion-then-answer-option (Q002.C001.R001)', async () => {
    const response = new SurveyResponse({
      _id: 'r1',
      surveyId,
      publicationId,
      snapshotId,
      answers: {
        Q001: 'Alice',
        Q002: { C001: { R001: 'good', R002: 'bad' } },
      },
    })
    const snapshotData = new SurveySnapshot({
      snapshotId,
      survey: surveyData,
    })

    const stream = await handler.prepareExportData(
      {
        surveyId,
        publicationId,
        responses: [response],
        snapshotData,
      },
      new CsvFormatHandler(),
    )

    const csv = await streamToString(stream)
    const lines = csv
      .trim()
      .split(/\r\n|\n/)
      .map((line) => line.trim())
    const [headerLine, , dataLine] = lines

    expect(headerLine).toContain('Q002.C001.R001')
    expect(headerLine).toContain('Q002.C001.R002')
    expect(headerLine).not.toContain('Q002.R001.C001')

    const headers = headerLine.split(',')
    const dataCols = dataLine.split(',')
    const r001Idx = headers.indexOf('Q002.C001.R001')
    const r002Idx = headers.indexOf('Q002.C001.R002')
    expect(dataCols[r001Idx]).toBe('good')
    expect(dataCols[r002Idx]).toBe('bad')
  })

  test('round-trips a matrix answer through export then import to the new subquestion-outer nesting', async () => {
    const response = new SurveyResponse({
      _id: 'r1',
      surveyId,
      publicationId,
      snapshotId,
      answers: {
        Q001: 'Alice',
        Q002: { C001: { R001: 'good', R002: 'bad' } },
      },
    })
    const snapshotData = new SurveySnapshot({
      snapshotId,
      survey: surveyData,
    })

    const exportStream = await handler.prepareExportData(
      {
        surveyId,
        publicationId,
        responses: [response],
        snapshotData,
      },
      new CsvFormatHandler(),
    )
    const csv = await streamToString(exportStream)

    const csvFormatHandler = new CsvFormatHandler()
    const parsedRows = await csvFormatHandler.parse(
      Readable.from([Buffer.from(csv, 'utf8')]),
    )
    // Replace the email/participant columns with importable values
    const headers = parsedRows[0] as string[]
    const emailIdx = headers.indexOf('email')
    ;(parsedRows[2] as string[])[emailIdx] = 'alice@example.com'

    const validation = await handler.validateImport(parsedRows, {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
      surveyId,
      publicationId,
      snapshotId,
    })

    expect(validation.valid).toBe(true)
    if (!validation.valid) return

    await handler.persistImport(validation.data, {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(mockRepoSurveyResponse.insertOne).toHaveBeenCalledTimes(1)
    const insertedResponse = mockRepoSurveyResponse.insertOne.mock
      .calls[0][0] as SurveyResponse

    expect(insertedResponse.answers).toEqual({
      Q001: 'Alice',
      Q002: { C001: { R001: 'good', R002: 'bad' } },
    })
  })

  test('exports Multi-Part parts as flat Q003.P001 columns (no answer-option segment)', async () => {
    const response = new SurveyResponse({
      _id: 'r1',
      surveyId,
      publicationId,
      snapshotId,
      answers: {
        Q001: 'Alice',
        Q003: { P001: 'first answer', P002: 'second answer' },
      },
    })
    const snapshotData = new SurveySnapshot({
      snapshotId,
      survey: surveyData,
    })

    const stream = await handler.prepareExportData(
      {
        surveyId,
        publicationId,
        responses: [response],
        snapshotData,
      },
      new CsvFormatHandler(),
    )

    const csv = await streamToString(stream)
    const lines = csv
      .trim()
      .split(/\r\n|\n/)
      .map((line) => line.trim())
    const [headerLine, labelLine, dataLine] = lines

    expect(headerLine).toContain('Q003.P001')
    expect(headerLine).toContain('Q003.P002')
    expect(headerLine).not.toContain('Q003.P001.')

    const headers = headerLine.split(',')
    const labels = labelLine.split(',')
    const dataCols = dataLine.split(',')
    expect(dataCols[headers.indexOf('Q003.P001')]).toBe('first answer')
    expect(dataCols[headers.indexOf('Q003.P002')]).toBe('second answer')

    // Row 2 labels must include the parent question text, not just the part
    expect(labels[headers.indexOf('Q003.P001')]).toBe('Multi-Part / Part 1')
    expect(labels[headers.indexOf('Q003.P002')]).toBe('Multi-Part / Part 2')
  })

  test('labels binary answer-option columns with question context, not just the option', async () => {
    const response = new SurveyResponse({
      _id: 'r1',
      surveyId,
      publicationId,
      snapshotId,
      answers: {
        Q001: 'Alice',
        Q004: { F001: true, F002: false },
      },
    })
    const snapshotData = new SurveySnapshot({
      snapshotId,
      survey: checkboxSurveyData,
    })

    const stream = await handler.prepareExportData(
      {
        surveyId,
        publicationId,
        responses: [response],
        snapshotData,
      },
      new CsvFormatHandler(),
    )

    const csv = await streamToString(stream)
    const lines = csv
      .trim()
      .split(/\r\n|\n/)
      .map((line) => line.trim())
    const [headerLine, labelLine] = lines

    const headers = headerLine.split(',')
    const labels = labelLine.split(',')

    expect(labels[headers.indexOf('Q004.F001')]).toBe('Fruit [Apple]')
    expect(labels[headers.indexOf('Q004.F002')]).toBe('Fruit [Pear]')
  })

  test('labels matrix-checkbox binary answer-option columns with question/subquestion context', async () => {
    const response = new SurveyResponse({
      _id: 'r1',
      surveyId,
      publicationId,
      snapshotId,
      answers: {
        Q001: 'Alice',
        Q005: { D001: { X001: true, X002: false } },
      },
    })
    const snapshotData = new SurveySnapshot({
      snapshotId,
      survey: matrixCheckboxSurveyData,
    })

    const stream = await handler.prepareExportData(
      {
        surveyId,
        publicationId,
        responses: [response],
        snapshotData,
      },
      new CsvFormatHandler(),
    )

    const csv = await streamToString(stream)
    const lines = csv
      .trim()
      .split(/\r\n|\n/)
      .map((line) => line.trim())
    const [headerLine, labelLine] = lines

    const headers = headerLine.split(',')
    const labels = labelLine.split(',')

    expect(labels[headers.indexOf('Q005.D001.X001')]).toBe(
      'Preferences / Day 1 [Cheese]',
    )
    expect(labels[headers.indexOf('Q005.D001.X002')]).toBe(
      'Preferences / Day 1 [Tomato]',
    )
  })

  test('round-trips a Multi-Part answer through export then import to the flat part shape', async () => {
    const response = new SurveyResponse({
      _id: 'r1',
      surveyId,
      publicationId,
      snapshotId,
      answers: {
        Q001: 'Alice',
        Q003: { P001: 'first answer', P002: 'second answer' },
      },
    })
    const snapshotData = new SurveySnapshot({
      snapshotId,
      survey: surveyData,
    })

    const exportStream = await handler.prepareExportData(
      {
        surveyId,
        publicationId,
        responses: [response],
        snapshotData,
      },
      new CsvFormatHandler(),
    )
    const csv = await streamToString(exportStream)

    const csvFormatHandler = new CsvFormatHandler()
    const parsedRows = await csvFormatHandler.parse(
      Readable.from([Buffer.from(csv, 'utf8')]),
    )
    const headers = parsedRows[0] as string[]
    const emailIdx = headers.indexOf('email')
    ;(parsedRows[2] as string[])[emailIdx] = 'alice@example.com'

    const validation = await handler.validateImport(parsedRows, {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
      surveyId,
      publicationId,
      snapshotId,
    })

    expect(validation.valid).toBe(true)
    if (!validation.valid) return

    await handler.persistImport(validation.data, {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(mockRepoSurveyResponse.insertOne).toHaveBeenCalledTimes(1)
    const insertedResponse = mockRepoSurveyResponse.insertOne.mock
      .calls[0][0] as SurveyResponse

    expect(insertedResponse.answers).toEqual({
      Q001: 'Alice',
      Q003: { P001: 'first answer', P002: 'second answer' },
    })
  })

  test('fetchForExport merges SurveyLanguageSnapshot text into the structural-only survey', async () => {
    const sparseSurveyData = {
      _id: surveyId,
      title: {},
      language: { default: 'en' },
      elements: [
        {
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: {},
          answerOptions: [{ _id: 'a1', code: 'F001', label: {} }],
        },
      ],
    }

    mockRepoSurveySnapshot.findOne.mockResolvedValue(
      new SurveySnapshot({
        _id: 'snap-1',
        snapshotId,
        survey: sparseSurveyData,
      }),
    )
    mockRepoSurveyLanguageSnapshot.find.mockResolvedValue([
      {
        snapshotId,
        languageCode: 'en',
        data: {
          elements: { q1: { text: 'Fruit' } },
          answerOptions: { a1: { label: 'Apple' } },
        },
      },
    ])

    const exportData = await handler.fetchForExport(
      surveyId,
      {
        projectId,
        aclConditions: {},
        aclContext: { jwt: { _id: 'user-1' } },
      } as unknown as EntityExportContext,
      { snapshotId },
    )

    const stream = await handler.prepareExportData(
      exportData,
      new CsvFormatHandler(),
    )
    const csv = await streamToString(stream)
    const lines = csv
      .trim()
      .split(/\r\n|\n/)
      .map((line) => line.trim())
    const [headerLine, labelLine] = lines

    const headers = headerLine.split(',')
    const labels = labelLine.split(',')

    expect(labels[headers.indexOf('Q001.F001')]).toBe('Fruit [Apple]')
    expect(mockRepoSurveyLanguageSnapshot.find).toHaveBeenCalledWith(
      { snapshotId, languageCode: { $in: ['en'] } },
      expect.anything(),
    )
  })

  test('orders CSV header columns by questionIds, not by the raw questions array order', async () => {
    const reorderedSurveyData = {
      ...surveyData,
      // questions array is left in its original q1/q2/q3 order, but the
      // survey's actual display order (questionIds) has been reversed
      elementIds: ['q3', 'q2', 'q1'],
    }
    const response = new SurveyResponse({
      _id: 'r1',
      surveyId,
      publicationId,
      snapshotId,
      answers: {
        Q001: 'Alice',
        Q003: { P001: 'foo', P002: 'bar' },
      },
    })
    const snapshotData = new SurveySnapshot({
      snapshotId,
      survey: reorderedSurveyData,
    })

    const stream = await handler.prepareExportData(
      {
        surveyId,
        publicationId,
        responses: [response],
        snapshotData,
      },
      new CsvFormatHandler(),
    )

    const csv = await streamToString(stream)
    const [headerLine] = csv
      .trim()
      .split(/\r\n|\n/)
      .map((line) => line.trim())
    const headers = headerLine.split(',')

    const q003Idx = headers.indexOf('Q003.P001')
    const q001Idx = headers.indexOf('Q001')
    expect(q003Idx).toBeGreaterThanOrEqual(0)
    expect(q001Idx).toBeGreaterThanOrEqual(0)
    expect(q003Idx).toBeLessThan(q001Idx)
  })

  test('orders CSV header columns by group order, taking precedence over stale questionIds', async () => {
    const groupedSurveyData = {
      _id: surveyId,
      title: { en: 'Grouped survey' },
      language: { default: 'en' },
      sections: [
        { _id: 'g1', code: 'G1' },
        { _id: 'g2', code: 'G2' },
      ],
      // Groups have been reordered so g2 now comes first...
      sectionIds: ['g2', 'g1'],
      elements: [
        { _id: 'q1', code: 'Q001', type: 'text', text: {}, sectionId: 'g1' },
        { _id: 'q2', code: 'Q002', type: 'text', text: {}, sectionId: 'g2' },
      ],
      // ...but questionIds was never re-synced and still lists q1 (group g1)
      // before q2 (group g2) - group order must win regardless.
      elementIds: ['q1', 'q2'],
    }
    const response = new SurveyResponse({
      _id: 'r1',
      surveyId,
      publicationId,
      snapshotId,
      answers: { Q001: 'Alice', Q002: 'Bob' },
    })
    const snapshotData = new SurveySnapshot({
      snapshotId,
      survey: groupedSurveyData,
    })

    const stream = await handler.prepareExportData(
      {
        surveyId,
        publicationId,
        responses: [response],
        snapshotData,
      },
      new CsvFormatHandler(),
    )

    const csv = await streamToString(stream)
    const [headerLine] = csv
      .trim()
      .split(/\r\n|\n/)
      .map((line) => line.trim())
    const headers = headerLine.split(',')

    const q001Idx = headers.indexOf('Q001')
    const q002Idx = headers.indexOf('Q002')
    expect(q001Idx).toBeGreaterThanOrEqual(0)
    expect(q002Idx).toBeGreaterThanOrEqual(0)
    expect(q002Idx).toBeLessThan(q001Idx)
  })
})
