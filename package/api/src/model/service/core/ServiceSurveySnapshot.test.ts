import { ServiceSurveySnapshot } from './ServiceSurveySnapshot'

jest.mock('model', () => ({}))

describe('ServiceSurveySnapshot.deleteMany embed artefacts', () => {
  test('removes the embed files of the deleted snapshots after the commit', async () => {
    const service = new ServiceSurveySnapshot()
    const snapshotIds = ['snap_1', 'snap_2']
    const repo = {
      find: jest
        .fn()
        .mockResolvedValue(snapshotIds.map((_id) => ({ _id, surveyId: 's1' }))),
      findOne: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn(
        (context: unknown, fn: (c: unknown, tx: unknown) => unknown) =>
          fn(context, {}),
      ),
    }
    const removeSnapshots = jest.fn().mockResolvedValue(undefined)
    jest
      .spyOn(service, 'getRepo')
      .mockImplementation((() => repo) as typeof service.getRepo)
    jest.spyOn(service, 'getService').mockImplementation((() => ({
      delete: jest.fn(),
    })) as typeof service.getService)
    Object.defineProperty(service, 'modelManager', {
      value: { services: { surveyEmbedArtefact: { removeSnapshots } } },
      writable: true,
    })

    await service.deleteMany({
      surveyId: 's1',
      snapshotIds,
      projectId: 'p1',
      aclConditions: {},
    })

    expect(removeSnapshots).toHaveBeenCalledWith({
      surveyId: 's1',
      projectId: 'p1',
      snapshotIds,
    })
    expect(repo.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      removeSnapshots.mock.invocationCallOrder[0],
    )
  })
})
