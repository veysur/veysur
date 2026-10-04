import { Survey } from 'veysur-common'

import { ServiceSurvey } from './ServiceSurvey'

jest.mock('model', () => ({}))

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

describe('ServiceSurvey template delegation', () => {
  const aclContext = { jwt: { _id: 'user-1' } }
  let service: ServiceSurvey
  let templateService: { list: jest.Mock; createSurvey: jest.Mock }

  beforeEach(() => {
    service = new ServiceSurvey()
    templateService = {
      list: jest.fn().mockReturnValue([{ id: 't' }]),
      createSurvey: jest.fn().mockResolvedValue({ _id: 'new-survey' }),
    }
    jest
      .spyOn(service, 'getService')
      .mockImplementation(((name: string) =>
        name === 'surveyTemplate'
          ? templateService
          : {}) as typeof service.getService)
  })

  test('listTemplates returns the template service list', () => {
    expect(service.listTemplates()).toEqual([{ id: 't' }])
  })

  test('create with a templateId delegates to the template service', async () => {
    const args = {
      survey: { name: 'x' },
      projectId: 'project-1',
      aclContext,
      templateId: 't',
    }
    await expect(service.create(args)).resolves.toEqual({ _id: 'new-survey' })
    expect(templateService.createSurvey).toHaveBeenCalledWith(args)
  })
})

describe('ServiceSurvey.patch realtime', () => {
  const aclContext = { jwt: { _id: 'user-1' } }
  let service: ServiceSurvey
  let realtime: { emitSurveyChanged: jest.Mock }

  beforeEach(() => {
    service = new ServiceSurvey()
    realtime = { emitSurveyChanged: jest.fn().mockResolvedValue(undefined) }
    jest
      .spyOn(service, 'getRepo')
      .mockImplementation((() => ({})) as typeof service.getRepo)
    jest
      .spyOn(service, 'getService')
      .mockImplementation(((name: string) =>
        name === 'realtime' ? realtime : {}) as typeof service.getService)
  })

  test('notifies the survey room after applying patches', async () => {
    await service.patch({
      surveyId: 's1',
      projectId: 'p1',
      patches: [],
      originClientId: 'c1',
      aclContext,
      context: {},
    })

    expect(realtime.emitSurveyChanged).toHaveBeenCalledWith('p1', {
      surveyId: 's1',
      originClientId: 'c1',
    })
  })
})
