import { surveyParticipantResponseConfig as generated } from 'model/service/core/ServiceSurveyParticipantResponse.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey-participant-response.ts before it was deleted. A `default` there
// was never read by the request parser; The service also takes inputs the old config never exposed (an unused surveyId path param, and optional publication ids); they are now declared, so they appear below.
// the generated `defaultValue` is the intentional difference.
describe('surveyParticipantResponse endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        get: {
          acl: [
            {
              allow: true,
              role: 'participant',
            },
          ],
          data: {
            surveyId: {
              required: false,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'get',
          path: '/:surveyId',
          verbs: ['get'],
        },
        save: {
          acl: [
            {
              allow: true,
              role: 'participant',
            },
          ],
          data: {
            ip: {
              required: false,
              src: 'request',
            },
            referrerUrl: {
              required: false,
              src: 'header',
              srcPath: 'Referer',
            },
            response: {
              required: true,
              src: 'body',
            },
            surveyId: {
              required: false,
              src: 'param',
            },
          },
          enable: true,
          errors: {
            PlanLimitExceededError: 402,
          },
          method: 'save',
          path: '/:surveyId',
          verbs: ['post'],
        },
      },
      service: 'surveyParticipantResponse',
    })
  })
})
