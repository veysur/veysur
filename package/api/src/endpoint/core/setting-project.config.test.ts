import { settingProjectConfig as generated } from 'model/service/core/ServiceSettingProject.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/setting-project.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('settingProject endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        getOne: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
          },
          enable: true,
          errors: {},
          method: 'getOne',
          path: '/',
          verbs: ['get'],
        },
        updateBotProtection: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            botProtection: {
              required: true,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
          },
          enable: true,
          errors: {},
          method: 'updateBotProtection',
          path: '/bot-protection',
          verbs: ['put'],
        },
        updateMaps: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            maps: {
              required: true,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
          },
          enable: true,
          errors: {},
          method: 'updateMaps',
          path: '/maps',
          verbs: ['put'],
        },
      },
      service: 'settingProject',
    })
  })
})
