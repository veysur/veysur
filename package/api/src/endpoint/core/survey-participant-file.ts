export const surveyParticipantFile = {
  service: 'surveyParticipantFile',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    postSurveyParticipantFileUploadUrl: {
      path: '/upload-url',
      method: 'generateUploadUrl',
      verbs: ['post'],
      data: {
        requestHost: {
          src: 'header',
          srcPath: 'X-Forwarded-Host',
          required: false,
        },
        requestProto: {
          src: 'header',
          srcPath: 'X-Forwarded-Proto',
          required: false,
        },
        filename: { src: 'body', required: true },
        fileHash: { src: 'body', required: true },
        fileSize: { src: 'body', required: true },
        mimeType: { src: 'body', required: true },
        questionCode: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'participant' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorBadRequest: { http: { code: 400 } },
          ServerErrorForbidden: { http: { code: 403 } },
          ServerErrorNotFound: { http: { code: 404 } },
          PlanLimitExceededError: { http: { code: 402 } },
        },
      },
    },

    confirmSurveyParticipantFileUpload: {
      path: '/:fileId/confirm',
      method: 'confirmUpload',
      verbs: ['post'],
      data: {
        fileId: { src: 'param', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'participant' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorBadRequest: { http: { code: 400 } },
          ServerErrorForbidden: { http: { code: 403 } },
          ServerErrorNotFound: { http: { code: 404 } },
        },
      },
    },
  },
}

export default surveyParticipantFile
