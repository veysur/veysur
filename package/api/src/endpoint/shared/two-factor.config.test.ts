import { twoFactorConfig as generated } from 'model/service/ServiceTwoFactor.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/two-factor.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('twoFactor endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        disable: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {
            password: {
              required: true,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'disable',
          path: '/disable',
          verbs: ['post'],
        },
        dismissPrompt: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {},
          enable: true,
          errors: {},
          method: 'dismissPrompt',
          path: '/dismiss-prompt',
          verbs: ['post'],
        },
        verifyAndEnable: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {
            code: {
              required: true,
              src: 'body',
            },
            secret: {
              required: true,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'verifyAndEnable',
          path: '/enable',
          verbs: ['post'],
        },
        enableAndLogin: {
          acl: [
            {
              allow: true,
              role: 'preAuth',
            },
          ],
          data: {
            code: {
              required: true,
              src: 'body',
            },
            jwtConfig: {
              required: true,
              src: 'config',
              srcPath: 'model.app.jwt',
            },
            secret: {
              required: true,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'enableAndLogin',
          path: '/enable-and-login',
          verbs: ['post'],
        },
        generateSetupData: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
            {
              allow: true,
              role: 'preAuth',
            },
          ],
          data: {},
          enable: true,
          errors: {},
          method: 'generateSetupData',
          path: '/setup',
          verbs: ['post'],
        },
        verifyLogin: {
          acl: [
            {
              allow: true,
              role: 'preAuth',
            },
          ],
          data: {
            code: {
              required: true,
              src: 'body',
            },
            jwtConfig: {
              required: true,
              src: 'config',
              srcPath: 'model.app.jwt',
            },
          },
          enable: true,
          errors: {},
          method: 'verifyLogin',
          path: '/verify-login',
          verbs: ['post'],
        },
      },
      service: 'twoFactor',
    })
  })
})
