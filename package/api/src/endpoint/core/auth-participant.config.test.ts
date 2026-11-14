import { authParticipantConfig as generated } from 'model/service/ServiceAuthParticipant.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/auth-participant.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('authParticipant endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        botChallenge: {
          acl: [
            {
              allow: true,
              role: 'participant',
            },
          ],
          data: {
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'botChallenge',
          path: '/:surveyId/bot-challenge',
          verbs: ['post'],
        },
        botVerify: {
          acl: [
            {
              allow: true,
              role: 'participant',
            },
          ],
          data: {
            honeypot: {
              required: false,
              src: 'body',
            },
            ip: {
              required: false,
              src: 'request',
            },
            jwtConfig: {
              required: true,
              src: 'config',
              srcPath: 'model.app.jwt',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
            token: {
              required: true,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'botVerify',
          path: '/:surveyId/bot-verify',
          verbs: ['post'],
        },
        post: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {
            emailVerifyToken: {
              required: false,
              src: 'body',
            },
            embedOrigin: {
              required: false,
              src: 'header',
              srcPath: 'X-Embed-Origin',
            },
            jwtConfig: {
              required: true,
              src: 'config',
              srcPath: 'model.app.jwt',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
            token: {
              required: false,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'auth',
          path: '/:surveyId',
          verbs: ['post'],
        },
        register: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {
            attributes: {
              required: false,
              src: 'body',
            },
            email: {
              required: true,
              src: 'body',
            },
            ip: {
              required: false,
              src: 'request',
            },
            language: {
              required: false,
              src: 'body',
            },
            nameFirst: {
              required: true,
              src: 'body',
            },
            nameLast: {
              required: true,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'register',
          path: '/:surveyId/register',
          verbs: ['post'],
        },
      },
      service: 'authParticipant',
    })
  })
})
