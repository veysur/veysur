import { emailTemplateConfig as generated } from 'model/service/core/ServiceEmailTemplate.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/email-template.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('emailTemplate endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        deleteProjectOne: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            lang: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            type: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'deleteProjectOne',
          path: '/:type/:lang',
          verbs: ['delete'],
        },
        deleteOne: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            lang: {
              required: true,
              src: 'param',
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
            type: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'deleteOne',
          path: '/survey/:surveyId/:type/:lang',
          verbs: ['delete'],
        },
        getProjectOne: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            lang: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            type: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'getProjectOne',
          path: '/:type/:lang',
          verbs: ['get'],
        },
        getProjectAll: {
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
          method: 'getProjectAll',
          path: '/',
          verbs: ['get'],
        },
        getOne: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            lang: {
              required: true,
              src: 'param',
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
            type: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'getOne',
          path: '/survey/:surveyId/:type/:lang',
          verbs: ['get'],
        },
        getAll: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            includeDefaults: {
              required: false,
              src: 'query',
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
          method: 'getAll',
          path: '/survey/:surveyId',
          verbs: ['get'],
        },
        getSystemTemplate: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            lang: {
              required: true,
              src: 'param',
            },
            type: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'getSystemTemplate',
          path: '/system/:type/:lang',
          verbs: ['get'],
        },
        getSystemTemplates: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            lang: {
              defaultValue: 'en',
              required: false,
              src: 'query',
            },
          },
          enable: true,
          errors: {},
          method: 'getSystemTemplates',
          path: '/system',
          verbs: ['get'],
        },
        patchProject: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            patches: {
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
          method: 'patchProject',
          path: '/',
          verbs: ['patch'],
        },
        patch: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            patches: {
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
          method: 'patch',
          path: '/survey/:surveyId',
          verbs: ['patch'],
        },
      },
      service: 'emailTemplate',
    })
  })
})
