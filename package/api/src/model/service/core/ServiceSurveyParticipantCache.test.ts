import { ServiceSurveyParticipantCache } from './ServiceSurveyParticipantCache'

describe('ServiceSurveyParticipantCache', () => {
  let service: ServiceSurveyParticipantCache

  beforeEach(() => {
    service = new ServiceSurveyParticipantCache()
  })

  test('getLive loads once per survey and keeps projects apart', async () => {
    const load = jest.fn().mockResolvedValue({ snapshotId: 's1' })

    await service.getLive('p1', 'survey', load)
    await service.getLive('p1', 'survey', load)
    expect(load).toHaveBeenCalledTimes(1)

    await service.getLive('p2', 'survey', load)
    expect(load).toHaveBeenCalledTimes(2)
  })

  test('invalidateSurvey drops the live entry', async () => {
    const load = jest.fn().mockResolvedValue({ snapshotId: 's1' })
    await service.getLive('p1', 'survey', load)

    await service.invalidateSurvey('p1', 'survey')
    await service.getLive('p1', 'survey', load)

    expect(load).toHaveBeenCalledTimes(2)
  })

  test('getView keys on snapshot and language', async () => {
    const load = jest.fn().mockResolvedValue({ view: true })

    await service.getView('p1', 'snap', 'en', load)
    await service.getView('p1', 'snap', 'en', load)
    await service.getView('p1', 'snap', 'de', load)
    await service.getView('p1', 'snap', null, load)

    expect(load).toHaveBeenCalledTimes(3)
  })

  test('invalidateProject drops that project views and bot protection only', async () => {
    const viewLoad = jest.fn().mockResolvedValue({ view: true })
    const botLoad = jest.fn().mockResolvedValue({ provider: 'none' })
    await service.getView('p1', 'snap', 'en', viewLoad)
    await service.getView('p2', 'snap', 'en', viewLoad)
    await service.getBotProtection('p1', botLoad)
    viewLoad.mockClear()
    botLoad.mockClear()

    await service.invalidateProject('p1')
    await service.getView('p1', 'snap', 'en', viewLoad)
    await service.getView('p2', 'snap', 'en', viewLoad)
    await service.getBotProtection('p1', botLoad)

    expect(viewLoad).toHaveBeenCalledTimes(1)
    expect(botLoad).toHaveBeenCalledTimes(1)
  })

  test('a loader error is thrown and not cached', async () => {
    const load = jest
      .fn()
      .mockRejectedValueOnce(new Error('not published'))
      .mockResolvedValueOnce({ snapshotId: 's1' })

    await expect(service.getLive('p1', 'survey', load)).rejects.toThrow(
      'not published',
    )
    expect(await service.getLive('p1', 'survey', load)).toEqual({
      snapshotId: 's1',
    })
  })
})
