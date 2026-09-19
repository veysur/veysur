export const surveyResponseConfig = {
  service: 'surveyResponse',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    postSurveyResponse: {
      path: '/:surveyId/:snapshotId',
      method: 'create',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        snapshotId: { src: 'param', required: true },
        publicationId: { src: 'body', required: false },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        response: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getAllSurveyResponse: {
      path: '/:surveyId',
      method: 'getAll',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        snapshotId: { src: 'query', required: false },
        publicationId: { src: 'query', required: false },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        page: { src: 'query', default: 1 },
        perPage: { src: 'query', default: 20 },
        completed: { src: 'query', required: false },
        startDate: { src: 'query', required: false },
        endDate: { src: 'query', required: false },
        dateField: { src: 'query', required: false },
        search: { src: 'query', required: false },
        merged: { src: 'query', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getSurveyResponse: {
      path: '/:surveyId/:responseId',
      method: 'getOne',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        responseId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    updateSurveyResponse: {
      path: '/:surveyId/:responseId',
      method: 'update',
      verbs: ['put'],
      data: {
        surveyId: { src: 'param', required: true },
        responseId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        response: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    deleteSurveyResponse: {
      path: '/:surveyId/:responseId',
      method: 'delete',
      verbs: ['delete'],
      data: {
        surveyId: { src: 'param', required: true },
        responseId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
  },
}

export default surveyResponseConfig
