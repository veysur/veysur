export const surveyParticipantAttributeSnapshotConfig = {
  service: 'surveyParticipantAttributeSnapshot',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getSurveyParticipantAttributeSnapshot: {
      path: '/:surveyId',
      method: 'get',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        lang: { src: 'query', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'all' }],
      },
    },
  },
}

export default surveyParticipantAttributeSnapshotConfig
