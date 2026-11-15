import { authHandoffConfig as generated } from 'model/service/ServiceAuthHandoff.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/auth-handoff.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('authHandoff endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        create: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {
            ip: {
              required: true,
              src: 'request',
            },
            jwtConfig: {
              required: true,
              src: 'config',
              srcPath: 'model.app.jwt',
            },
            rememberMe: {
              required: false,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'create',
          path: '/',
          verbs: ['post'],
        },
        redeem: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {
            token: {
              required: true,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'redeem',
          path: '/redeem',
          verbs: ['post'],
        },
      },
      service: 'authHandoff',
    })
  })
})
