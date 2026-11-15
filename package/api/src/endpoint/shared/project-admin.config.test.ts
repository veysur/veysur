import { projectAdminConfig as generated } from 'model/service/ServiceProjectAdmin.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/project-admin.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('projectAdmin endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        remove: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
            {
              allow: true,
              role: 'projectOwner',
            },
          ],
          data: {
            projectAdminId: {
              required: false,
              src: 'param',
            },
            projectId: {
              required: false,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'remove',
          path: '/:projectId/:projectAdminId',
          verbs: ['delete'],
        },
        getInviteDetail: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {
            code: {
              required: false,
              src: 'query',
            },
            email: {
              required: false,
              src: 'query',
            },
          },
          enable: true,
          errors: {},
          method: 'getInviteDetail',
          path: '/accept-detail',
          verbs: ['get'],
        },
        listWithUsers: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
            {
              allow: true,
              role: 'projectOwner',
            },
          ],
          data: {
            limit: {
              required: false,
              src: 'query',
            },
            projectId: {
              required: false,
              src: 'param',
            },
            skip: {
              required: false,
              src: 'query',
            },
          },
          enable: true,
          errors: {},
          method: 'listWithUsers',
          path: '/:projectId',
          verbs: ['get'],
        },
        accept: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {
            code: {
              required: false,
              src: 'body',
            },
            email: {
              required: false,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'accept',
          path: '/accept',
          verbs: ['post'],
        },
        acceptNewAccount: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {
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
            code: {
              required: true,
              src: 'body',
            },
            deviceId: {
              required: false,
              src: 'header',
              srcPath: 'Device-Id',
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
            nameFirst: {
              required: true,
              src: 'body',
            },
            nameLast: {
              required: false,
              src: 'body',
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
          method: 'acceptNewAccount',
          path: '/accept-new-account',
          verbs: ['post'],
        },
        decline: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {
            code: {
              required: false,
              src: 'body',
            },
            email: {
              required: false,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'decline',
          path: '/decline',
          verbs: ['post'],
        },
        invite: {
          acl: [
            {
              allow: true,
              role: 'projectOwner',
            },
          ],
          data: {
            email: {
              required: false,
              src: 'body',
            },
            nameFirst: {
              required: false,
              src: 'body',
            },
            nameLast: {
              required: false,
              src: 'body',
            },
            projectId: {
              required: false,
              src: 'param',
            },
          },
          enable: true,
          errors: {
            PlanLimitExceededError: 402,
          },
          method: 'invite',
          path: '/:projectId/invite',
          verbs: ['post'],
        },
      },
      service: 'projectAdmin',
    })
  })
})
