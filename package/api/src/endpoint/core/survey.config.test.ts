import { surveyConfig as generated } from 'model/service/core/ServiceSurvey/ServiceSurvey.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('survey endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        deleteSurvey: {
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
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'delete',
          path: '/:surveyId',
          verbs: ['delete'],
        },
        getAllSurvey: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            dateField: {
              defaultValue: 'createdAt',
              required: false,
              src: 'query',
            },
            endDate: {
              required: false,
              src: 'query',
            },
            page: {
              defaultValue: 1,
              required: false,
              src: 'query',
            },
            perPage: {
              defaultValue: 20,
              required: false,
              src: 'query',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            search: {
              required: false,
              src: 'query',
            },
            startDate: {
              required: false,
              src: 'query',
            },
          },
          enable: true,
          errors: {},
          method: 'getAll',
          path: '/',
          verbs: ['get'],
        },
        getSurvey: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            defaultLang: {
              required: false,
              src: 'query',
            },
            lang: {
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
          method: 'getOne',
          path: '/:surveyId',
          verbs: ['get'],
        },
        getSurveyTemplateList: {
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
          method: 'listTemplates',
          path: '/template/list',
          verbs: ['get'],
        },
        patchSurvey: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            originClientId: {
              required: false,
              src: 'header',
              srcPath: 'X-Client-Id',
            },
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
          path: '/:surveyId',
          verbs: ['patch'],
        },
        postSurvey: {
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
            survey: {
              required: true,
              src: 'body',
            },
            templateId: {
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
      },
      service: 'survey',
    })
  })
})
