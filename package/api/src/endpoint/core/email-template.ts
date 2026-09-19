export const emailTemplate = {
  service: 'emailTemplate',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    // Survey-level endpoints (surveyId from URL)
    // IMPORTANT: These must come BEFORE project-level /:type/:lang routes
    // to avoid incorrect route matching
    getSurveyEmailTemplates: {
      path: '/survey/:surveyId',
      method: 'getAll',
      verbs: ['get'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        surveyId: { src: 'param', required: true },
        includeDefaults: { src: 'query', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getSurveyEmailTemplate: {
      path: '/survey/:surveyId/:type/:lang',
      method: 'getOne',
      verbs: ['get'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        surveyId: { src: 'param', required: true },
        type: { src: 'param', required: true },
        lang: { src: 'param', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    patchSurveyEmailTemplate: {
      path: '/survey/:surveyId',
      method: 'patch',
      verbs: ['patch'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        surveyId: { src: 'param', required: true },
        patches: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    deleteSurveyEmailTemplate: {
      path: '/survey/:surveyId/:type/:lang',
      method: 'deleteOne',
      verbs: ['delete'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        surveyId: { src: 'param', required: true },
        type: { src: 'param', required: true },
        lang: { src: 'param', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },

    // Project-level endpoints (surveyId = null)
    getProjectEmailTemplates: {
      path: '/',
      method: 'getProjectAll',
      verbs: ['get'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getProjectEmailTemplate: {
      path: '/:type/:lang',
      method: 'getOne',
      verbs: ['get'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        surveyId: { src: 'const', value: null },
        type: { src: 'param', required: true },
        lang: { src: 'param', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    patchProjectEmailTemplate: {
      path: '/',
      method: 'patchProject',
      verbs: ['patch'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        patches: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    deleteProjectEmailTemplate: {
      path: '/:type/:lang',
      method: 'deleteOne',
      verbs: ['delete'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        surveyId: { src: 'const', value: null },
        type: { src: 'param', required: true },
        lang: { src: 'param', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },

    // System-level endpoints (read-only, no projectId required)
    getSystemEmailTemplates: {
      path: '/system',
      method: 'getSystemTemplates',
      verbs: ['get'],
      data: {
        lang: { src: 'query', required: false, default: 'en' },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getSystemEmailTemplate: {
      path: '/system/:type/:lang',
      method: 'getSystemTemplate',
      verbs: ['get'],
      data: {
        type: { src: 'param', required: true },
        lang: { src: 'param', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
  },
}

export default emailTemplate
