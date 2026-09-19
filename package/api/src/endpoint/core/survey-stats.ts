export const surveyStatsConfig = {
  service: 'surveyStats',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getSurveyStats: {
      path: '/:surveyId/:snapshotId',
      method: 'getStats',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        snapshotId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        publicationId: { src: 'query', required: false },
        completed: { src: 'query', required: false, default: 'all' },
        startDate: { src: 'query', required: false },
        endDate: { src: 'query', required: false },
        dateField: { src: 'query', required: false, default: 'createdAt' },
        search: { src: 'query', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
  },
}

export default surveyStatsConfig
