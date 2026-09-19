export const settingSurvey = {
  service: 'settingSurvey',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getSettingSurvey: {
      path: '/',
      method: 'getOne',
      verbs: ['get'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    patchSettingSurvey: {
      path: '/',
      method: 'patch',
      verbs: ['patch'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        patches: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
      response: {
        error: {
          PlanLimitExceededError: { http: { code: 402 } },
        },
      },
    },
  },
}

export default settingSurvey
