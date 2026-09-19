export const surveyParticipantSnapshot = {
  service: 'surveyParticipantSnapshot',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getSurveyParticipantSnapshot: {
      path: '/:surveyId',
      method: 'get',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        lang: { src: 'query', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'participant' }],
      },
    },
    getSurveyParticipantSnapshotPartial: {
      path: '/:surveyId/partial',
      method: 'getPartial',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'all' }],
      },
    },
  },
}

export default surveyParticipantSnapshot
