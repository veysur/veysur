import { surveyResponseConfig as generated } from 'model/service/core/ServiceSurveyResponse.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey-response.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('surveyResponse endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        deleteSurveyResponse: {
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
            responseId: {
              required: true,
              src: 'param',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'delete',
          path: '/:surveyId/:responseId',
          verbs: ['delete'],
        },
        getAllSurveyResponse: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            completed: {
              required: false,
              src: 'query',
            },
            dateField: {
              required: false,
              src: 'query',
            },
            endDate: {
              required: false,
              src: 'query',
            },
            merged: {
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
            publicationId: {
              required: false,
              src: 'query',
            },
            search: {
              required: false,
              src: 'query',
            },
            snapshotId: {
              required: false,
              src: 'query',
            },
            startDate: {
              required: false,
              src: 'query',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'getAll',
          path: '/:surveyId',
          verbs: ['get'],
        },
        getSurveyResponse: {
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
            responseId: {
              required: true,
              src: 'param',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'getOne',
          path: '/:surveyId/:responseId',
          verbs: ['get'],
        },
        postSurveyResponse: {
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
            publicationId: {
              required: false,
              src: 'body',
            },
            response: {
              required: true,
              src: 'body',
            },
            snapshotId: {
              required: true,
              src: 'param',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'create',
          path: '/:surveyId/:snapshotId',
          verbs: ['post'],
        },
        updateSurveyResponse: {
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
            response: {
              required: true,
              src: 'body',
            },
            responseId: {
              required: true,
              src: 'param',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'update',
          path: '/:surveyId/:responseId',
          verbs: ['put'],
        },
      },
      service: 'surveyResponse',
    })
  })
})
