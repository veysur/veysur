import { verifyEmailConfig as generated } from 'model/service/ServiceVerifyEmail.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/verify-email.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('verifyEmail endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        getSend: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {},
          enable: true,
          errors: {},
          method: 'send',
          path: '/send',
          verbs: ['get'],
        },
        postVerify: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {
            email: {
              required: true,
              src: 'body',
            },
            token: {
              required: true,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'verify',
          path: '/verify',
          verbs: ['post'],
        },
      },
      service: 'verifyEmail',
    })
  })
})
