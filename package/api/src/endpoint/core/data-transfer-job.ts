export const dataTransferJobConfig = {
  service: 'dataTransferJob',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }], // Default deny
  },
  endpoints: {
    listJobs: {
      path: '/list',
      method: 'listJobs',
      verbs: ['get'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        page: { src: 'query', default: 1 },
        perPage: { src: 'query', default: 20 },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorInternal: { http: { code: 500 } },
        },
      },
    },
    getStatus: {
      path: '/status/:jobId',
      method: 'getStatus',
      verbs: ['get'],
      data: {
        jobId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorInternal: { http: { code: 500 } },
          ServerErrorNotFound: { http: { code: 404 } },
        },
      },
    },
    deleteJob: {
      path: '/:jobId',
      method: 'deleteJob',
      verbs: ['delete'],
      data: {
        jobId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorInternal: { http: { code: 500 } },
          ServerErrorNotFound: { http: { code: 404 } },
          ServerErrorBadRequest: { http: { code: 400 } },
        },
      },
    },
  },
}
