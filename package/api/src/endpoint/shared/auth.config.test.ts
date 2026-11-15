import { authConfig as generated } from 'model/service/ServiceAuth.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/auth.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('auth endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        delete: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {},
          enable: true,
          errors: {},
          method: 'delete',
          path: '/',
          verbs: ['delete'],
        },
        refresh: {
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
          },
          enable: true,
          errors: {},
          method: 'refresh',
          path: '/refresh',
          verbs: ['post'],
        },
      },
      service: 'auth',
    })
  })
})
