import { allowConsole } from '../../../test-utils/consoleGuard'
import { ServiceSurveyEmbedArtefact } from './ServiceSurveyEmbedArtefact'

jest.mock('model', () => ({}))

const mockPutObject = jest.fn()
const mockDeleteObject = jest.fn()
const mockObjectExists = jest.fn()
const mockDeleteByPrefix = jest.fn()

jest.mock('common', () => ({
  ...jest.requireActual('common'),
  createStorageAdaptor: () => ({
    putObject: mockPutObject,
    deleteObject: mockDeleteObject,
  }),
  objectExists: (...args: unknown[]) => mockObjectExists(...args),
  deleteStorageObjectsByPrefix: (...args: unknown[]) =>
    mockDeleteByPrefix(...args),
}))

jest.mock('model/common', () => ({
  ...jest.requireActual('model/common'),
  mergeSurveyLanguageSnapshots: jest
    .fn()
    .mockImplementation(
      async (_repo, survey, _snapshotId, langCodes: string[]) => ({
        ...survey,
        mergedLangs: langCodes,
      }),
    ),
}))

jest.mock('config/edition', () => ({
  ...jest.requireActual('config/edition'),
  isSelfHosted: () => true,
}))

jest.mock('./ServiceFile/FileS3Config', () => ({
  getStorageConfig: () => ({ publicBucket: 'pub' }),
}))

describe('ServiceSurveyEmbedArtefact', () => {
  const surveyId = 'survey_1'
  const projectId = 'proj_1'

  let service: ServiceSurveyEmbedArtefact
  let findPublication: jest.Mock
  let snapshotAccess: { open: boolean; embed: boolean }
  let mockParticipantSnapshot: {
    getGatedSettingSurvey: jest.Mock
    isNoBrandAllowed: jest.Mock
  }

  const pointerBody = () => {
    const call = mockPutObject.mock.calls.find(([params]) =>
      params.Key.endsWith('/embed/current.json'),
    )
    return JSON.parse(call[0].Body)
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockObjectExists.mockResolvedValue(false)
    mockPutObject.mockResolvedValue(undefined)
    mockDeleteObject.mockResolvedValue(undefined)
    mockDeleteByPrefix.mockResolvedValue({ deletedCount: 0, keys: [] })
    snapshotAccess = { open: true, embed: true }

    service = new ServiceSurveyEmbedArtefact()
    findPublication = jest.fn().mockResolvedValue({
      _id: 'pub_1',
      snapshotId: 'snap_1',
    })
    mockParticipantSnapshot = {
      getGatedSettingSurvey: jest.fn().mockResolvedValue({ gated: true }),
      isNoBrandAllowed: jest.fn().mockResolvedValue(false),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyPublication: { findOne: findPublication },
        surveySnapshotPartial: {
          findOne: jest.fn().mockResolvedValue({
            _id: 'snap_1',
            surveyPartial: {
              language: { default: 'en' },
              access: snapshotAccess,
              schedule: { start: null },
            },
          }),
        },
        surveySnapshot: {
          findOne: jest
            .fn()
            .mockResolvedValue({ snapshotId: 'snap_1', survey: { id: 's' } }),
        },
        surveyLanguageSnapshot: {
          find: jest
            .fn()
            .mockResolvedValue([
              { languageCode: 'en' },
              { languageCode: 'de' },
            ]),
        },
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    Object.defineProperty(service, 'modelManager', {
      value: {
        services: { surveyParticipantSnapshot: mockParticipantSnapshot },
      },
      writable: true,
    })
  })

  test('writes one artefact per language, then the pointer', async () => {
    await service.write({ surveyId, projectId })

    const keys = mockPutObject.mock.calls.map(([params]) => params.Key)
    expect(keys).toEqual([
      'project-proj_1/survey/survey_1/embed/snap_1/en.json',
      'project-proj_1/survey/survey_1/embed/snap_1/de.json',
      'project-proj_1/survey/survey_1/embed/current.json',
    ])
  })

  test('merges the requested language with the default language', async () => {
    await service.write({ surveyId, projectId })

    const deCall = mockPutObject.mock.calls.find(([params]) =>
      params.Key.endsWith('/de.json'),
    )
    expect(JSON.parse(deCall[0].Body).snapshotData.survey.mergedLangs).toEqual([
      'de',
      'en',
    ])
  })

  test('skips artefacts that already exist but still rewrites the pointer', async () => {
    mockObjectExists.mockResolvedValue(true)

    await service.write({ surveyId, projectId })

    expect(mockPutObject).toHaveBeenCalledTimes(1)
    expect(mockPutObject.mock.calls[0][0].Key).toMatch(/embed\/current\.json$/)
  })

  test('pointer names the live snapshot and carries the gated live settings', async () => {
    await service.write({ surveyId, projectId })

    expect(pointerBody()).toMatchObject({
      version: 1,
      surveyId,
      snapshotId: 'snap_1',
      publicationId: 'pub_1',
      languages: ['en', 'de'],
      defaultLanguage: 'en',
      access: { open: true, embed: true },
      noBrandAvailable: false,
      settingSurveyData: { gated: true },
    })
  })

  test('removes the pointer and writes nothing when the survey is not published', async () => {
    findPublication.mockResolvedValue(null)

    await service.write({ surveyId, projectId })

    expect(mockPutObject).not.toHaveBeenCalled()
    expect(mockDeleteObject).toHaveBeenCalledWith({
      Bucket: 'pub',
      Key: 'project-proj_1/survey/survey_1/embed/current.json',
    })
  })

  test('removes the pointer and writes nothing when the live snapshot does not allow embedding', async () => {
    snapshotAccess = { open: true, embed: false }

    await service.write({ surveyId, projectId })

    expect(mockPutObject).not.toHaveBeenCalled()
    expect(mockDeleteObject).toHaveBeenCalledTimes(1)
  })

  describe('refresh', () => {
    test('swallows a storage failure and logs a warning', async () => {
      mockPutObject.mockRejectedValue(new Error('storage down'))

      await allowConsole(/Failed to write embed artefact/, async () => {
        await expect(
          service.refresh({ surveyId, projectId }),
        ).resolves.toBeUndefined()
      })
    })
  })

  describe('removeSnapshots', () => {
    test('deletes each snapshot prefix, then refreshes the pointer', async () => {
      await service.removeSnapshots({
        surveyId,
        projectId,
        snapshotIds: ['snap_1', 'snap_2'],
      })

      expect(
        mockDeleteByPrefix.mock.calls.map(([, , prefix]) => prefix),
      ).toEqual([
        'project-proj_1/survey/survey_1/embed/snap_1/',
        'project-proj_1/survey/survey_1/embed/snap_2/',
      ])
      expect(findPublication).toHaveBeenCalled()
    })

    test('still refreshes the pointer when deleting files fails', async () => {
      mockDeleteByPrefix.mockRejectedValue(new Error('storage down'))

      await allowConsole(/Failed to remove embed artefacts/, async () => {
        await service.removeSnapshots({
          surveyId,
          projectId,
          snapshotIds: ['snap_1'],
        })
      })

      expect(findPublication).toHaveBeenCalled()
    })
  })

  describe('removeSurvey', () => {
    test('deletes everything under the survey embed prefix', async () => {
      await service.removeSurvey({ surveyId, projectId })

      expect(mockDeleteByPrefix).toHaveBeenCalledWith(
        expect.anything(),
        'pub',
        'project-proj_1/survey/survey_1/embed/',
      )
    })

    test('does not throw when storage fails', async () => {
      mockDeleteByPrefix.mockRejectedValue(new Error('storage down'))

      await allowConsole(/Failed to remove embed artefacts/, async () => {
        await expect(
          service.removeSurvey({ surveyId, projectId }),
        ).resolves.toBeUndefined()
      })
    })
  })

  const mockProjectRepos = (
    publications: Array<{ surveyId: string; snapshotId: string }>,
    embeddedSnapshotIds: string[],
  ) => {
    const original = (service.getRepo as jest.Mock).getMockImplementation()
    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      if (name === 'surveyPublication') {
        return { find: jest.fn().mockResolvedValue(publications) }
      }
      if (name === 'surveySnapshotPartial') {
        return {
          find: jest.fn().mockResolvedValue(
            publications.map((p) => ({
              _id: p.snapshotId,
              surveyPartial: {
                access: { embed: embeddedSnapshotIds.includes(p.snapshotId) },
              },
            })),
          ),
        }
      }
      return original?.(name)
    }) as typeof service.getRepo)
  }

  describe('refreshProject', () => {
    test('refreshes only the live surveys whose snapshot allows embedding', async () => {
      mockProjectRepos(
        [
          { surveyId: 'a', snapshotId: 'snap_a' },
          { surveyId: 'b', snapshotId: 'snap_b' },
        ],
        ['snap_b'],
      )
      const refresh = jest.spyOn(service, 'refresh').mockResolvedValue()

      await service.refreshProject({ projectId })

      expect(refresh).toHaveBeenCalledTimes(1)
      expect(refresh).toHaveBeenCalledWith({ surveyId: 'b', projectId })
    })

    test('does nothing for a project with no live publications', async () => {
      mockProjectRepos([], [])
      const refresh = jest.spyOn(service, 'refresh').mockResolvedValue()

      await service.refreshProject({ projectId })

      expect(refresh).not.toHaveBeenCalled()
    })

    test('does not throw when the lookup fails', async () => {
      jest.spyOn(service, 'getRepo').mockImplementation(() => {
        throw new Error('db down')
      })

      await allowConsole(/Failed to refresh embed pointers/, async () => {
        await expect(
          service.refreshProject({ projectId }),
        ).resolves.toBeUndefined()
      })
    })
  })

  describe('repairAll', () => {
    test('rewrites each live embed-enabled survey and reports the count', async () => {
      mockProjectRepos(
        [
          { surveyId: 'a', snapshotId: 'snap_a' },
          { surveyId: 'b', snapshotId: 'snap_b' },
          { surveyId: 'c', snapshotId: 'snap_c' },
        ],
        ['snap_a', 'snap_c'],
      )
      const write = jest.spyOn(service, 'write').mockResolvedValue()

      const result = await service.repairAll()

      expect(write.mock.calls.map(([args]) => args.surveyId)).toEqual([
        'a',
        'c',
      ])
      expect(result).toEqual({ repaired: 2, failed: 0 })
    })

    test('keeps going after a survey fails and counts it as failed', async () => {
      mockProjectRepos(
        [
          { surveyId: 'a', snapshotId: 'snap_a' },
          { surveyId: 'b', snapshotId: 'snap_b' },
        ],
        ['snap_a', 'snap_b'],
      )
      jest
        .spyOn(service, 'write')
        .mockRejectedValueOnce(new Error('storage down'))
        .mockResolvedValueOnce()

      await allowConsole(/Failed to repair embed artefact/, async () => {
        const result = await service.repairAll()

        expect(result).toEqual({ repaired: 1, failed: 1 })
      })
    })
  })
})
