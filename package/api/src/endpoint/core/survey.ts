export const surveyConfig = {
  service: 'survey',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    postSurvey: {
      path: '/',
      method: 'create',
      verbs: ['post'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        survey: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getAllSurvey: {
      path: '/',
      method: 'getAll',
      verbs: ['get'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        page: { src: 'query', default: 1 },
        perPage: { src: 'query', default: 20 },
        search: { src: 'query', required: false },
        startDate: { src: 'query', required: false },
        endDate: { src: 'query', required: false },
        dateField: { src: 'query', required: false, default: 'createdAt' },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getSurvey: {
      path: '/:surveyId',
      method: 'getOne',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        lang: { src: 'query', required: false },
        defaultLang: { src: 'query', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    patchSurvey: {
      path: '/:surveyId',
      method: 'patch',
      verbs: ['patch'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        patches: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    deleteSurvey: {
      path: '/:surveyId',
      method: 'delete',
      verbs: ['delete'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
  },
}

export default surveyConfig
