import { DataSourceContext } from 'mzen-om'
import { RepoSurveyParticipant } from 'model/repo'
import { EmailVerifyToken } from './EmailVerifyToken'

describe('EmailVerifyToken', () => {
  describe('ensureFor', () => {
    test('generates and persists a token when the participant has none', async () => {
      const updateOne = jest.fn().mockResolvedValue(undefined)
      const repoSurveyParticipant = {
        updateOne,
      } as unknown as RepoSurveyParticipant
      const context = {} as DataSourceContext
      const participant: { _id: string; emailVerifyToken?: string } = {
        _id: 'participant-1',
      }

      const token = await EmailVerifyToken.ensureFor(
        participant,
        repoSurveyParticipant,
        context,
      )

      expect(token).toBe(participant.emailVerifyToken)
      expect(token).toHaveLength(6)
      expect(updateOne).toHaveBeenCalledWith(
        { _id: 'participant-1' },
        { $set: { emailVerifyToken: token } },
        { context },
      )
    })

    test('leaves an existing token untouched and does not persist', async () => {
      const updateOne = jest.fn().mockResolvedValue(undefined)
      const repoSurveyParticipant = {
        updateOne,
      } as unknown as RepoSurveyParticipant
      const context = {} as DataSourceContext
      const participant = {
        _id: 'participant-1',
        emailVerifyToken: 'EXISTING',
      }

      const token = await EmailVerifyToken.ensureFor(
        participant,
        repoSurveyParticipant,
        context,
      )

      expect(token).toBe('EXISTING')
      expect(updateOne).not.toHaveBeenCalled()
    })
  })

  describe('buildSurveyLink', () => {
    test('builds a survey link with the emailVerifyToken as ?evt=', () => {
      const link = EmailVerifyToken.buildSurveyLink({
        surveyDomain: 'project.veysur.local',
        surveyId: 'survey-1',
        token: 'ABC123',
        emailVerifyToken: 'XYZ789',
      })

      expect(link).toBe(
        'https://project.veysur.local/survey/survey-1/ABC123?evt=XYZ789',
      )
    })

    test('appends &lang= when a language is given', () => {
      const link = EmailVerifyToken.buildSurveyLink({
        surveyDomain: 'project.veysur.local',
        surveyId: 'survey-1',
        token: 'ABC123',
        emailVerifyToken: 'XYZ789',
        language: 'zh',
      })

      expect(link).toBe(
        'https://project.veysur.local/survey/survey-1/ABC123?evt=XYZ789&lang=zh',
      )
    })

    test('omits &lang= when language is null/undefined', () => {
      expect(
        EmailVerifyToken.buildSurveyLink({
          surveyDomain: 'project.veysur.local',
          surveyId: 'survey-1',
          token: 'ABC123',
          emailVerifyToken: 'XYZ789',
          language: null,
        }),
      ).toBe('https://project.veysur.local/survey/survey-1/ABC123?evt=XYZ789')
    })

    test('URL-encodes the language value', () => {
      const link = EmailVerifyToken.buildSurveyLink({
        surveyDomain: 'project.veysur.local',
        surveyId: 'survey-1',
        token: 'ABC123',
        emailVerifyToken: 'XYZ789',
        language: 'pt-BR',
      })

      expect(link).toContain('&lang=pt-BR')
    })
  })
})
