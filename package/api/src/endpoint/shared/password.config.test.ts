import { passwordConfig as generated } from 'model/service/ServicePassword.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/password.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('password endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        resetEmail: {
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
          },
          enable: true,
          errors: {},
          method: 'resetEmail',
          path: '/reset-email',
          verbs: ['post'],
        },
        put: {
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
            password: {
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
          method: 'put',
          path: '/',
          verbs: ['put'],
        },
      },
      service: 'password',
    })
  })
})
