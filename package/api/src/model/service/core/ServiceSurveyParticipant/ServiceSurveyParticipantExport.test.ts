import type { Response } from 'express'
import { ServiceSurveyParticipantExport } from './ServiceSurveyParticipantExport'

describe('ServiceSurveyParticipantExport', () => {
  let service: ServiceSurveyParticipantExport
  let mockRepoSurveyParticipant: { find: jest.Mock }
  let mockRepoSurveyParticipantAttribute: { findOne: jest.Mock }
  let response: Response
  let written: string[]

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceSurveyParticipantExport()

    mockRepoSurveyParticipant = {
      find: jest.fn().mockResolvedValue([]),
    }
    mockRepoSurveyParticipantAttribute = {
      findOne: jest.fn().mockResolvedValue(null),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyParticipant: mockRepoSurveyParticipant,
        surveyParticipantAttribute: mockRepoSurveyParticipantAttribute,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    written = []
    response = {
      setHeader: jest.fn(),
      write: jest.fn((chunk: string) => written.push(chunk)),
      end: jest.fn(),
    } as unknown as Response
  })

  test('appends custom attribute columns to the header row', async () => {
    mockRepoSurveyParticipantAttribute.findOne.mockResolvedValue({
      _id: 'doc1',
      attributes: [
        { name: 'department', required: false, internal: false, example: null },
        { name: 'region', required: false, internal: false, example: null },
      ],
    })

    await service.export({ surveyId: 's1', projectId: 'p1', response })

    expect(written[0]).toContain('department')
    expect(written[0]).toContain('region')
  })

  test('includes internal attributes in the header', async () => {
    mockRepoSurveyParticipantAttribute.findOne.mockResolvedValue({
      _id: 'doc1',
      attributes: [
        { name: 'department', required: false, internal: false, example: null },
        {
          name: 'internalNote',
          required: false,
          internal: true,
          example: null,
        },
      ],
    })

    await service.export({ surveyId: 's1', projectId: 'p1', response })

    expect(written[0]).toContain('department')
    expect(written[0]).toContain('internalNote')
  })

  test('includes custom attribute values for each participant row', async () => {
    mockRepoSurveyParticipantAttribute.findOne.mockResolvedValue({
      _id: 'doc1',
      attributes: [
        { name: 'department', required: false, internal: false, example: null },
      ],
    })
    mockRepoSurveyParticipant.find
      .mockResolvedValueOnce([
        {
          nameFirst: 'Jane',
          nameLast: 'Doe',
          email: 'jane@example.com',
          attributes: { department: 'Sales' },
        },
      ])
      .mockResolvedValueOnce([])

    await service.export({ surveyId: 's1', projectId: 'p1', response })

    const rows = written.slice(1).join('')
    expect(rows).toContain('Sales')
  })

  test('outputs an empty string when a participant has no value for the attribute', async () => {
    mockRepoSurveyParticipantAttribute.findOne.mockResolvedValue({
      _id: 'doc1',
      attributes: [
        { name: 'department', required: false, internal: false, example: null },
      ],
    })
    mockRepoSurveyParticipant.find
      .mockResolvedValueOnce([
        {
          nameFirst: 'Jane',
          nameLast: 'Doe',
          email: 'jane@example.com',
          attributes: {},
        },
      ])
      .mockResolvedValueOnce([])

    await service.export({ surveyId: 's1', projectId: 'p1', response })

    const rows = written.slice(1).join('')
    expect(rows).toContain('Jane,Doe,jane@example.com')
  })

  test('never includes emailVerifyToken in the header or any row, even though the document has one', async () => {
    mockRepoSurveyParticipant.find
      .mockResolvedValueOnce([
        {
          nameFirst: 'Jane',
          nameLast: 'Doe',
          email: 'jane@example.com',
          token: 'ABC123',
          emailVerifyToken: 'super-secret-verify-token',
          attributes: {},
        },
      ])
      .mockResolvedValueOnce([])

    await service.export({ surveyId: 's1', projectId: 'p1', response })

    const output = written.join('')
    expect(output).not.toContain('emailVerifyToken')
    expect(output).not.toContain('super-secret-verify-token')
  })
})
