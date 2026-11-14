import { surveyParticipantAttributeConfig as surveyParticipantAttributeConfigGenerated } from 'model/service/core/ServiceSurveyParticipantAttribute/ServiceSurveyParticipantAttribute.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey-participant-attribute.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
// Where a service takes inputs the old config never exposed, they are now declared and appear below.
describe('survey-participant-attribute endpoint config', () => {
  it('surveyParticipantAttribute matches the previous hand-written config', () => {
    expect(
      projectEndpointConfig(surveyParticipantAttributeConfigGenerated),
    ).toEqual({
      enable: true,
      endpoints: {
        batchSaveSurveyParticipantAttribute: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            changes: {
              required: true,
              src: 'body',
            },
            orderedAttributeNames: {
              required: false,
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
          method: 'batchSave',
          path: '/:surveyId',
          verbs: ['patch'],
        },
        deleteSurveyParticipantAttribute: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            attributeName: {
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
          },
          enable: true,
          errors: {},
          method: 'delete',
          path: '/:surveyId/:attributeName',
          verbs: ['delete'],
        },
        getAllSurveyParticipantAttribute: {
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
          method: 'list',
          path: '/:surveyId',
          verbs: ['get'],
        },
        postSurveyParticipantAttribute: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            attribute: {
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
          method: 'create',
          path: '/:surveyId',
          verbs: ['post'],
        },
      },
      path: '/survey-participant-attribute',
      service: 'surveyParticipantAttribute',
    })
  })
})
