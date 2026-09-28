export const notificationConfig = {
  service: 'notification',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }], // Default deny
  },
  endpoints: {
    list: {
      path: '/list',
      method: 'list',
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
    markRead: {
      path: '/:notificationId/read',
      method: 'markRead',
      verbs: ['post'],
      data: {
        notificationId: { src: 'param', required: true },
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
    dismiss: {
      path: '/:notificationId',
      method: 'dismiss',
      verbs: ['delete'],
      data: {
        notificationId: { src: 'param', required: true },
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
  },
}
