import type {
  RepoSurvey,
  RepoSurveyResponse,
  RepoSurveyPublication,
  RepoSurveySnapshot,
  RepoSurveySnapshotPartial,
  RepoSurveyParticipant,
  RepoSurveyElement,
  RepoSurveySection,
  RepoSurveyLanguage,
  RepoFile,
} from 'model'

import { SurveyFullEntityHandler } from './SurveyFullEntityHandler'
import type { EntityExportContext } from '../EntityHandlerInterface'

describe('SurveyFullEntityHandler.estimateExportSize', () => {
  const projectId = 'project-1'
  const surveyId = 'survey-1'

  const baseContext: EntityExportContext = {
    projectId,
    aclConditions: {},
    aclContext: { jwt: { _id: 'user-1' } },
  }

  const surveyWithAnswerOptionImage = {
    _id: surveyId,
    elements: {
      questionList: () => [
        {
          answerOptions: [{ image: { en: { fileId: 'file-original' } } }],
        },
      ],
    },
  }

  let mockRepoSurvey: { findOne: jest.Mock }
  let mockRepoSurveyResponse: { count: jest.Mock }
  let mockRepoSurveyPublication: { find: jest.Mock }
  let mockRepoFile: { findOne: jest.Mock; find: jest.Mock }
  let handler: SurveyFullEntityHandler

  beforeEach(() => {
    mockRepoSurvey = {
      findOne: jest.fn().mockResolvedValue(surveyWithAnswerOptionImage),
    }
    mockRepoSurveyResponse = { count: jest.fn().mockResolvedValue(0) }
    mockRepoSurveyPublication = { find: jest.fn().mockResolvedValue([]) }
    mockRepoFile = {
      findOne: jest
        .fn()
        .mockResolvedValue({ _id: 'file-original', imageSetId: 'imgset-1' }),
      find: jest.fn().mockResolvedValue([
        { _id: 'file-original', imageVariant: 'original', size: 3_600_000 },
      ]),
    }

    handler = new SurveyFullEntityHandler(
      mockRepoSurvey as unknown as RepoSurvey,
      mockRepoSurveyResponse as unknown as RepoSurveyResponse,
      mockRepoSurveyPublication as unknown as RepoSurveyPublication,
      {} as RepoSurveySnapshot,
      {} as RepoSurveySnapshotPartial,
      {} as RepoSurveyParticipant,
      {} as RepoSurveyElement,
      {} as RepoSurveySection,
      { find: jest.fn().mockResolvedValue([]) } as unknown as RepoSurveyLanguage,
      undefined,
      mockRepoFile as unknown as RepoFile,
      { publicBucket: 'public', privateBucket: 'private' } as never,
    )
  })

  test('counts the live survey embedded images even with zero publications (unpublished survey)', async () => {
    const size = await handler.estimateExportSize(surveyId, baseContext)

    expect(mockRepoSurveyPublication.find).toHaveBeenCalledWith(
      { surveyId },
      expect.anything(),
    )
    expect(size).toBe(3_600_000)
  })
})
