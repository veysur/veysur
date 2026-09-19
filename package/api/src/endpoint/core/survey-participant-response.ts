export const surveyParticipantResponse = {
  service: 'surveyParticipantResponse',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getSurveyParticipantResponse: {
      path: '/:surveyId',
      method: 'get',
      verbs: ['get'],
      acl: {
        rules: [{ allow: true, role: 'participant' }],
      },
    },
    saveSurveyParticipantResponse: {
      path: '/:surveyId',
      method: 'save',
      verbs: ['post'],
      data: {
        response: { src: 'body', required: true },
        ip: { src: 'request', required: false },
        referrerUrl: { srcPath: 'Referer', src: 'header', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'participant' }],
      },
      response: {
        error: {
          PlanLimitExceededError: { http: { code: 402 } },
        },
      },
    },
  },
}

export default surveyParticipantResponse
