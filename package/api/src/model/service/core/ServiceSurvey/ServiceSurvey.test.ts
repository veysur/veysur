import { Survey } from 'veysur-common'

import { ServiceSurvey } from './ServiceSurvey'

jest.mock('model', () => ({}))

const mockResolve = jest.fn()
const mockPersist = jest.fn()
jest.mock(
  '../ImportExport/handlers/SurveyEntityHandler/MarkdownImportResolver',
  () => ({
    MarkdownImportResolver: jest.fn().mockImplementation(() => ({
      resolve: mockResolve,
    })),
  }),
)
jest.mock(
  '../ImportExport/handlers/SurveyEntityHandler/MarkdownImportPersister',
  () => ({
    MarkdownImportPersister: jest.fn().mockImplementation(() => ({
      persist: mockPersist,
    })),
  }),
)

describe('ServiceSurvey.create section seeding', () => {
  let service: ServiceSurvey
  let patchSpy: jest.SpyInstance
  let repoCreate: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ServiceSurvey()

    repoCreate = jest.fn().mockResolvedValue(undefined)
    const repoSurvey = {
      create: repoCreate,
      // Run the transaction body immediately; transaction semantics are not under test.
      transaction: jest.fn(
        (context: unknown, fn: (c: unknown, tx: unknown) => unknown) =>
          fn(context, {}),
      ),
    }

    jest
      .spyOn(service, 'getRepo')
      .mockImplementation(((name: string) =>
        name === 'survey' ? repoSurvey : {}) as typeof service.getRepo)

    patchSpy = jest.spyOn(service, 'patch').mockResolvedValue(undefined)

    Object.defineProperty(service, 'modelManager', {
      value: {
        services: { eventLog: { log: jest.fn().mockResolvedValue(undefined) } },
      },
      writable: true,
    })
  })

  const callCreate = (name: string) =>
    service.create({
      survey: { _id: 'survey-1', name },
      projectId: 'project-1',
      aclContext: { jwt: { _id: 'user-1' } },
    })

  type PatchLike = {
    type: string
    action: string
    data: Record<string, unknown>
  }

  const getPatches = (): PatchLike[] => patchSpy.mock.calls[0][0].patches

  const sectionPatch = (kind: string): PatchLike | undefined =>
    getPatches().find(
      (p) =>
        p.type === 'section' && p.action === 'create' && p.data.kind === kind,
    )

  const surveyPatch = (): PatchLike | undefined =>
    getPatches().find((p) => p.type === 'survey' && p.action === 'update')

  test('persists the bare survey then seeds welcome + group + thank-you sections', async () => {
    await callCreate('My Survey')

    expect(repoCreate).toHaveBeenCalledTimes(1)
    expect(repoCreate.mock.calls[0][0]).toMatchObject({ _id: 'survey-1' })
    expect(patchSpy).toHaveBeenCalledTimes(1)

    const welcome = sectionPatch('welcome')
    const group = sectionPatch('group')
    const thankYou = sectionPatch('thankYou')

    expect(welcome).toBeDefined()
    expect(group).toBeDefined()
    expect(thankYou).toBeDefined()

    expect(surveyPatch()!.data.sectionIds).toEqual([
      welcome!.data._id,
      group!.data._id,
      thankYou!.data._id,
    ])
    expect(surveyPatch()!.data.title).toEqual({ en: 'My Survey' })
  })

  test('initial group code and name come from the shared Survey model', async () => {
    await callCreate('Another Survey')

    const modelGroup = new Survey({ _id: 'survey-1' })
      .ensureWelcomeSection()
      .ensureThankYouSection()
      .addSection({})
      .applySortOrder()
      .sections.groups()[0]

    const group = sectionPatch('group')!

    expect(group.data.code).toBe(modelGroup.code)
    expect(group.data.code).toBe('G001')
    // Model default carries heading markup, not the old hardcoded plain "Group G001".
    expect(group.data.name).toEqual({ ...modelGroup.name })
    expect((group.data.name as Record<string, string>).en).toContain('<h3>')
    expect(typeof group.data._id).toBe('string')
    expect((group.data._id as string).length).toBeGreaterThan(0)
  })

  test('welcome and thank-you sections seed with sentinel codes and no name', async () => {
    await callCreate('My Survey')

    expect(sectionPatch('welcome')!.data).toEqual({
      _id: expect.any(String),
      code: 'WELCOME',
      kind: 'welcome',
    })
    expect(sectionPatch('thankYou')!.data).toEqual({
      _id: expect.any(String),
      code: 'THANKYOU',
      kind: 'thankYou',
    })
  })

  test('empty survey name yields an empty title', async () => {
    await callCreate('')

    expect(surveyPatch()!.data.title).toEqual({ en: '' })
  })
})

describe('ServiceSurvey template creation', () => {
  let service: ServiceSurvey
  let findOne: jest.Mock
  let logSpy: jest.Mock

  const aclContext = { jwt: { _id: 'user-1' } }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ServiceSurvey()
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
    const templates = service.listTemplates()
    expect(templates.length).toBeGreaterThan(0)
    for (const template of templates) {
      expect(template.name).toBeTruthy()
      expect(template.description).toBeTruthy()
      expect(template.questionCount).toBeGreaterThan(0)
    }
  })

  test('creates from a template, applying the admin name to name and default title', async () => {
    const [{ id }] = service.listTemplates()

    const result = await service.create({
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
      service.create({
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
    const [{ id }] = service.listTemplates()
    await expect(
      service.create({
        survey: { name: 'x' },
        projectId: 'project-1',
        aclContext,
        templateId: id,
      }),
    ).rejects.toThrow('failed validation')
    expect(mockPersist).not.toHaveBeenCalled()
  })
})
