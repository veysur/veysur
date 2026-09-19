import { DataSourceMock } from 'mzen-om'
import { SchemaSurveyParticipant } from 'veysur-common/model/schema'
import { SurveyParticipant } from 'veysur-common/model/constructor'

import { RepoSurveyParticipant } from './RepoSurveyParticipant'
import { RepoSurveyResponse } from './RepoSurveyResponse'

describe('RepoSurveyParticipant surveyResponse relation', () => {
  const SURVEY_ID = 'survey-1'
  const PROJECT_ID = 'project-1'
  const PARTICIPANT_ID = 'participant-1'

  afterEach(() => {
    jest.useFakeTimers()
  })

  test('populates a completed response onto the participant', async () => {
    // Schema type-casting of default Date fields (createdAt/updatedAt) chokes
    // on jest's fake-timer Date subclass - irrelevant to production, where
    // fake timers never run.
    jest.useRealTimers()
    const dataSource = new DataSourceMock({
      surveyParticipant: [
        {
          _id: PARTICIPANT_ID,
          surveyId: SURVEY_ID,
          projectId: PROJECT_ID,
          nameFirst: 'Jane',
          nameLast: 'Doe',
          email: 'jane@example.com',
          language: 'en',
        },
      ],
      surveyResponse: [
        {
          _id: 'response-1',
          surveyId: SURVEY_ID,
          projectId: PROJECT_ID,
          participantId: PARTICIPANT_ID,
          completed: true,
          completedAt: new Date(),
        },
      ],
    })

    const repoSurveyParticipant = new RepoSurveyParticipant()
    const repoSurveyResponse = new RepoSurveyResponse()
    repoSurveyParticipant.dataSource = dataSource
    repoSurveyResponse.dataSource = dataSource
    repoSurveyParticipant.addRepos([repoSurveyResponse])
    // Wire the real, strict production schema - rules out the schema silently
    // stripping the populated surveyResponse field before it reaches the API response.
    repoSurveyParticipant.addSchema(new SchemaSurveyParticipant())
    repoSurveyParticipant.addConstructor(SurveyParticipant)

    const [participant] = await repoSurveyParticipant.find(
      { surveyId: SURVEY_ID, projectId: PROJECT_ID },
      { populate: { surveyResponse: true } },
    )

    expect(participant.surveyResponse).toBeDefined()
    expect(participant.surveyResponse?.completed).toBe(true)
  })

  test('leaves surveyResponse undefined when the participant has not responded', async () => {
    const dataSource = new DataSourceMock({
      surveyParticipant: [
        {
          _id: PARTICIPANT_ID,
          surveyId: SURVEY_ID,
          projectId: PROJECT_ID,
          nameFirst: 'Jane',
          nameLast: 'Doe',
          email: 'jane@example.com',
          language: 'en',
        },
      ],
      surveyResponse: [],
    })

    const repoSurveyParticipant = new RepoSurveyParticipant()
    const repoSurveyResponse = new RepoSurveyResponse()
    repoSurveyParticipant.dataSource = dataSource
    repoSurveyResponse.dataSource = dataSource
    repoSurveyParticipant.addRepos([repoSurveyResponse])

    const [participant] = await repoSurveyParticipant.find(
      { surveyId: SURVEY_ID, projectId: PROJECT_ID },
      { populate: { surveyResponse: true } },
    )

    expect(participant.surveyResponse).toBeUndefined()
  })
})
