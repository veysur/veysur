import { surveyParticipantFileConfig as generated } from 'model/service/core/ServiceSurveyParticipantFile.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey-participant-file.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('surveyParticipantFile endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        confirmUpload: {
          acl: [
            {
              allow: true,
              role: 'participant',
            },
          ],
          data: {
            fileId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'confirmUpload',
          path: '/:fileId/confirm',
          verbs: ['post'],
        },
        generateUploadUrl: {
          acl: [
            {
              allow: true,
              role: 'participant',
            },
          ],
          data: {
            fileHash: {
              required: true,
              src: 'body',
            },
            fileSize: {
              required: true,
              src: 'body',
            },
            filename: {
              required: true,
              src: 'body',
            },
            mimeType: {
              required: true,
              src: 'body',
            },
            questionCode: {
              required: true,
              src: 'body',
            },
            requestHost: {
              required: false,
              src: 'header',
              srcPath: 'X-Forwarded-Host',
            },
            requestProto: {
              required: false,
              src: 'header',
              srcPath: 'X-Forwarded-Proto',
            },
          },
          enable: true,
          errors: {
            PlanLimitExceededError: 402,
          },
          method: 'generateUploadUrl',
          path: '/upload-url',
          verbs: ['post'],
        },
      },
      service: 'surveyParticipantFile',
    })
  })
})
