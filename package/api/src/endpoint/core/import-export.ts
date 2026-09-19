export const importExportConfig = {
  service: 'importExport',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }], // Default deny
  },
  endpoints: {
    exportEntity: {
      path: '/export/:entityType/:entityId/:format',
      method: 'export',
      verbs: ['post'],
      data: {
        entityType: { src: 'param', required: true },
        entityId: { src: 'param', required: true },
        format: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        requestHost: {
          src: 'header',
          srcPath: 'X-Forwarded-Host',
          required: false,
        },
        requestProto: {
          src: 'header',
          srcPath: 'X-Forwarded-Proto',
          required: false,
        },
        options: { src: 'body', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorInternal: { http: { code: 500 } },
          ServerErrorBadRequest: { http: { code: 400 } },
          ServerErrorNotFound: { http: { code: 404 } },
        },
      },
    },
    generateImportUrl: {
      path: '/import/url/:entityType',
      method: 'generateImportUrl',
      verbs: ['post'],
      data: {
        entityType: { src: 'param', required: true },
        format: { src: 'body', required: true },
        options: { src: 'body', default: {} },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        requestHost: {
          src: 'header',
          srcPath: 'X-Forwarded-Host',
          required: false,
        },
        requestProto: {
          src: 'header',
          srcPath: 'X-Forwarded-Proto',
          required: false,
        },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorInternal: { http: { code: 500 } },
          ServerErrorBadRequest: { http: { code: 400 } },
          ServerErrorNotFound: { http: { code: 404 } },
        },
      },
    },
    processImport: {
      path: '/import/process/:fileId',
      method: 'processImport',
      verbs: ['post'],
      data: {
        fileId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorInternal: { http: { code: 500 } },
          ServerErrorBadRequest: { http: { code: 400 } },
          ServerErrorNotFound: { http: { code: 404 } },
        },
      },
    },
  },
}
