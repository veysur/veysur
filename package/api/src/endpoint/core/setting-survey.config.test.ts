import { settingSurveyConfig as generated } from 'model/service/core/ServiceSettingSurvey.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/setting-survey.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('settingSurvey endpoint config', () => {
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
          },
          enable: true,
          errors: {
            PlanLimitExceededError: 402,
          },
          method: 'patch',
          path: '/',
          verbs: ['patch'],
        },
      },
      service: 'settingSurvey',
    })
  })
})
