import { ServiceSurveyParticipantGenerate } from './ServiceSurveyParticipantGenerate'

const SURVEY_ID = 'survey-1'
const PROJECT_ID = 'project-1'

const makeService = () => {
  const service = new ServiceSurveyParticipantGenerate() as unknown as Omit<
    ServiceSurveyParticipantGenerate,
    'getRepo'
  > & { getRepo: jest.Mock }

  const repoSurveyParticipant = {
    create: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]), // no existing emails/tokens conflict
  }
  const repoSurvey = {
    findOne: jest.fn().mockResolvedValue({ _id: SURVEY_ID }),
  }
  const repoSettingSurvey = {
    findOne: jest.fn().mockResolvedValue({}),
  }

  service.getRepo = jest.fn((name: string) => {
    if (name === 'surveyParticipant') return repoSurveyParticipant
    if (name === 'survey') return repoSurvey
    if (name === 'settingSurvey') return repoSettingSurvey
    throw new Error(`Unexpected repo: ${name}`)
  })

  return { service, repoSurveyParticipant }
}

describe('ServiceSurveyParticipantGenerate.generate', () => {
  test('each batch-generated test participant gets a distinct emailVerifyToken', async () => {
    const { service, repoSurveyParticipant } = makeService()

    await service.generate({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      count: 3,
      aclContext: { jwt: { _id: 'user-1' } } as never,
    })

    expect(repoSurveyParticipant.create).toHaveBeenCalledTimes(3)
    const tokens = repoSurveyParticipant.create.mock.calls.map(
      ([participant]) => participant.emailVerifyToken,
    )
    tokens.forEach((token) => expect(token).toEqual(expect.any(String)))
    expect(new Set(tokens).size).toBe(3)
  })
})
