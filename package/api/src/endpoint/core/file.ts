export const fileConfig = {
  path: '/file',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    postFileUploadUrl: {
      service: 'fileUpload',
      path: '/upload-url',
      method: 'generateUploadUrl',
      verbs: ['post'],
      data: {
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
        filename: { src: 'body', required: true },
        fileHash: { src: 'body', required: true },
        fileSize: { src: 'body', required: true },
        mimeType: { src: 'body', required: true },
        surveyId: { src: 'body', required: false },
        responseId: { src: 'body', required: false },
        fileContext: { src: 'body', required: false },
        imageSetId: { src: 'body', required: false },
        imageVariant: { src: 'body', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorBadRequest: { http: { code: 400 } },
          PlanLimitExceededError: { http: { code: 402 } },
        },
      },
    },

    confirmFileUpload: {
      service: 'fileUpload',
      path: '/:fileId/confirm',
      method: 'confirmUpload',
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
          ServerErrorBadRequest: { http: { code: 400 } },
          ServerErrorNotFound: { http: { code: 404 } },
        },
      },
    },

    getFile: {
      service: 'file',
      path: '/:fileId',
      method: 'getOne',
      verbs: ['get'],
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
          ServerErrorNotFound: { http: { code: 404 } },
        },
      },
    },

    getAllFile: {
      service: 'file',
      path: '/',
      method: 'getAll',
      verbs: ['get'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        page: { src: 'query', default: 1 },
        perPage: { src: 'query', default: 50 },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },

    hardDeleteFiles: {
      service: 'fileDeletion',
      path: '/hard/:olderThan?',
      method: 'hardDelete',
      verbs: ['delete'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        olderThan: { src: 'param', required: false },
        fileContext: { src: 'query', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorBadRequest: { http: { code: 400 } },
        },
      },
    },

    deleteFile: {
      service: 'fileDeletion',
      path: '/:fileId',
      method: 'delete',
      verbs: ['delete'],
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
          ServerErrorNotFound: { http: { code: 404 } },
          ServerErrorBadRequest: { http: { code: 400 } },
        },
      },
    },

    deleteImageSet: {
      service: 'fileDeletion',
      path: '/image-set',
      method: 'deleteImageSet',
      verbs: ['delete'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        imageSetId: { src: 'body', required: true },
        surveyId: { src: 'body', required: false },
        responseId: { src: 'body', required: false },
        fileContext: { src: 'body', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
      response: {
        error: {
          Error: { http: { code: 500 } },
          ServerErrorBadRequest: { http: { code: 400 } },
        },
      },
    },

    getFilesBySurvey: {
      service: 'file',
      path: '/survey/:surveyId',
      method: 'getFilesForSurvey',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        page: { src: 'query', default: 1 },
        perPage: { src: 'query', default: 50 },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },

    getFilesByResponse: {
      service: 'file',
      path: '/survey/:surveyId/response/:responseId',
      method: 'getFilesForResponse',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        responseId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        page: { src: 'query', default: 1 },
        perPage: { src: 'query', default: 50 },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
  },
}

export default fileConfig
