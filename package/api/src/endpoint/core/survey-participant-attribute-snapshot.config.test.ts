import { surveyParticipantAttributeSnapshotConfig as generated } from 'model/service/core/ServiceSurveyParticipantAttributeSnapshot.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey-participant-attribute-snapshot.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('surveyParticipantAttributeSnapshot endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        getSurveyParticipantAttributeSnapshot: {
          acl: [
            {
              allow: true,
              role: 'all',
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
      },
      service: 'surveyParticipantAttributeSnapshot',
    })
  })
})
