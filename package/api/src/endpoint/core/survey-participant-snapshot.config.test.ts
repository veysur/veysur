import { surveyParticipantSnapshotConfig as generated } from 'model/service/core/ServiceSurveyParticipantSnapshot.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey-participant-snapshot.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('surveyParticipantSnapshot endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        get: {
          acl: [
            {
              allow: true,
              role: 'participant',
            },
          ],
          data: {
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
          method: 'get',
          path: '/:surveyId',
          verbs: ['get'],
        },
        getPartial: {
          acl: [
            {
              allow: true,
              role: 'all',
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
          method: 'getPartial',
          path: '/:surveyId/partial',
          verbs: ['get'],
        },
      },
      service: 'surveyParticipantSnapshot',
    })
  })
})
