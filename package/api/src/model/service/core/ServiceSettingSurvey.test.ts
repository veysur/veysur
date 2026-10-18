import { ServiceSettingSurvey } from './ServiceSettingSurvey'

jest.mock('model', () => ({}))

describe('ServiceSettingSurvey.patch', () => {
  test('refreshes the embed pointers of the project after saving', async () => {
    const service = new ServiceSettingSurvey()
    const updateOne = jest.fn().mockResolvedValue(undefined)
    const refreshProject = jest.fn().mockResolvedValue(undefined)
    jest
      .spyOn(service, 'getRepo')
      .mockImplementation((() => ({ updateOne })) as typeof service.getRepo)
    Object.defineProperty(service, 'modelManager', {
      value: { services: { surveyEmbedArtefact: { refreshProject } } },
      writable: true,
    })

    await service.patch({
      projectId: 'proj_1',
      patches: [
        {
          type: 'settingSurvey',
          action: 'update',
          data: { 'presentation.noBrand': true },
        },
      ],
    })

    expect(updateOne).toHaveBeenCalled()
    expect(refreshProject).toHaveBeenCalledWith({ projectId: 'proj_1' })
  })
})
