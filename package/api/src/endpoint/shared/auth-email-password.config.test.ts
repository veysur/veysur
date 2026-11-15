import { authEmailPasswordConfig as generated } from 'model/service/ServiceAuthEmailPassword.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/auth-email-password.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('authEmailPassword endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        login: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {
            botCheck: {
              required: false,
              src: 'body',
            },
            buildNumber: {
              required: false,
              src: 'header',
              srcPath: 'Build-Number',
            },
            buildVersion: {
              required: false,
              src: 'header',
              srcPath: 'Build-Version',
            },
            clientId: {
              required: false,
              src: 'header',
              srcPath: 'Client-Id',
            },
            deviceName: {
              required: false,
              src: 'header',
              srcPath: 'Device-Name',
            },
            deviceSystem: {
              required: false,
              src: 'header',
              srcPath: 'Device-System',
            },
            deviceSystemVersion: {
              required: false,
              src: 'header',
              srcPath: 'Device-System-Version',
            },
            email: {
              required: true,
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
            notificationToken: {
              required: false,
              src: 'header',
              srcPath: 'Notification-Token',
            },
            password: {
              required: true,
              src: 'body',
            },
            userAgent: {
              required: false,
              src: 'header',
              srcPath: 'User-Agent',
            },
          },
          enable: true,
          errors: {},
          method: 'login',
          path: '/login',
          verbs: ['post'],
        },
      },
      service: 'authEmailPassword',
    })
  })
})
