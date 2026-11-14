import { surveyStatsConfig as generated } from 'model/service/core/ServiceSurveyStats/ServiceSurveyStats.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey-stats.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('surveyStats endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        getSurveyStats: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            completed: {
              defaultValue: 'all',
              required: false,
              src: 'query',
            },
            dateField: {
              defaultValue: 'createdAt',
              required: false,
              src: 'query',
            },
            endDate: {
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
              required: true,
              src: 'param',
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
          method: 'getStats',
          path: '/:surveyId/:snapshotId',
          verbs: ['get'],
        },
      },
      service: 'surveyStats',
    })
  })
})
