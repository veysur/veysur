import { userConfig as generated } from 'model/service/ServiceUser.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/user.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('user endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        getMe: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {},
          enable: true,
          errors: {},
          method: 'me',
          path: '/me',
          verbs: ['get'],
        },
        postValidateEmailNotRegistered: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {
            value: {
              required: true,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'validateEmailNotRegistered',
          path: '/validate-email-not-registered',
          verbs: ['post'],
        },
        postValidatePasswordCurrent: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {
            value: {
              required: true,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'validatePasswordCurrent',
          path: '/validate-password-current',
          verbs: ['post'],
        },
        putProfile: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {
            data: {
              required: true,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'putProfile',
          path: '/profile',
          verbs: ['put'],
        },
      },
      service: 'user',
    })
  })
})
