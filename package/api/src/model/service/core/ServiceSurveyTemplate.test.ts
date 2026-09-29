import { ServiceSurveyTemplate } from './ServiceSurveyTemplate'

jest.mock('model', () => ({}))

const mockResolve = jest.fn()
const mockPersist = jest.fn()
jest.mock(
  './ImportExport/handlers/SurveyEntityHandler/MarkdownImportResolver',
  () => ({
    MarkdownImportResolver: jest.fn().mockImplementation(() => ({
      resolve: mockResolve,
    })),
  }),
)
jest.mock(
  './ImportExport/handlers/SurveyEntityHandler/MarkdownImportPersister',
  () => ({
    MarkdownImportPersister: jest.fn().mockImplementation(() => ({
      persist: mockPersist,
    })),
  }),
)

describe('ServiceSurveyTemplate', () => {
  let service: ServiceSurveyTemplate
  let findOne: jest.Mock
  let logSpy: jest.Mock

  const aclContext = { jwt: { _id: 'user-1' } }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ServiceSurveyTemplate()
    findOne = jest.fn().mockResolvedValue({ _id: 'new-survey' })
    logSpy = jest.fn().mockResolvedValue(undefined)

    jest
      .spyOn(service, 'getRepo')
      .mockImplementation((() => ({ findOne })) as typeof service.getRepo)
    Object.defineProperty(service, 'modelManager', {
      value: { services: { eventLog: { log: logSpy } } },
      writable: true,
    })
    mockResolve.mockImplementation(async (bundle) => ({
      valid: true,
      data: bundle,
    }))
    mockPersist.mockResolvedValue({ entityId: 'new-survey' })
  })

  test('lists templates with name, description and question count', () => {
    const templates = service.list()
    expect(templates.length).toBeGreaterThan(0)
    for (const template of templates) {
      expect(template.name).toBeTruthy()
      expect(template.description).toBeTruthy()
      expect(template.questionCount).toBeGreaterThan(0)
    }
  })

  test('creates from a template, applying the admin name to name and default title', async () => {
    const [{ id }] = service.list()

    const result = await service.createSurvey({
      survey: { _id: 'ignored', name: '  Q3 Feedback  ' },
      projectId: 'project-1',
      aclContext,
      templateId: id,
    })

    expect(result).toEqual({ _id: 'new-survey' })
    const bundle = mockResolve.mock.calls[0][0]
    expect(bundle.survey.name).toBe('Q3 Feedback')
    expect(bundle.survey.title.en).toBe('Q3 Feedback')
    expect(bundle.elements.length).toBeGreaterThan(0)
    expect(mockPersist).toHaveBeenCalledWith(
      expect.objectContaining({ sourceFormat: 'markdown' }),
      { projectId: 'project-1', aclContext },
    )
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'survey.created',
        metadata: { surveyId: 'new-survey', templateId: id },
      }),
    )
  })

  test('rejects an unknown template id without persisting', async () => {
    await expect(
      service.createSurvey({
        survey: { name: 'x' },
        projectId: 'project-1',
        aclContext,
        templateId: '../secret',
      }),
    ).rejects.toThrow("Unknown survey template '../secret'")
    expect(mockPersist).not.toHaveBeenCalled()
  })

  test('rejects a template that fails validation', async () => {
    mockResolve.mockResolvedValue({ valid: false, errors: [] })
    const [{ id }] = service.list()
    await expect(
      service.createSurvey({
        survey: { name: 'x' },
        projectId: 'project-1',
        aclContext,
        templateId: id,
      }),
    ).rejects.toThrow('failed validation')
    expect(mockPersist).not.toHaveBeenCalled()
  })
})
