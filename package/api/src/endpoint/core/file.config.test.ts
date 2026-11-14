import { fileUploadConfig as fileUploadConfigGenerated } from 'model/service/core/ServiceFile/ServiceFileUpload.endpoints'
import { fileConfig as fileConfigGenerated } from 'model/service/core/ServiceFile/ServiceFile.endpoints'
import { fileDeletionConfig as fileDeletionConfigGenerated } from 'model/service/core/ServiceFile/ServiceFileDeletion.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/file.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
// Where a service takes inputs the old config never exposed, they are now declared and appear below.
describe('file endpoint config', () => {
  it('fileUpload matches the previous hand-written config', () => {
    expect(projectEndpointConfig(fileUploadConfigGenerated)).toEqual({
      enable: true,
      endpoints: {
        confirmFileUpload: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            fileId: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
          },
          enable: true,
          errors: {},
          method: 'confirmUpload',
          path: '/:fileId/confirm',
          verbs: ['post'],
        },
        postFileUploadUrl: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            fileContext: {
              required: false,
              src: 'body',
            },
            fileHash: {
              required: true,
              src: 'body',
            },
            fileSize: {
              required: true,
              src: 'body',
            },
            filename: {
              required: true,
              src: 'body',
            },
            imageSetId: {
              required: false,
              src: 'body',
            },
            imageVariant: {
              required: false,
              src: 'body',
            },
            mimeType: {
              required: true,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            requestHost: {
              required: false,
              src: 'header',
              srcPath: 'X-Forwarded-Host',
            },
            requestProto: {
              required: false,
              src: 'header',
              srcPath: 'X-Forwarded-Proto',
            },
            responseId: {
              required: false,
              src: 'body',
            },
            surveyId: {
              required: false,
              src: 'body',
            },
          },
          enable: true,
          errors: {
            PlanLimitExceededError: 402,
          },
          method: 'generateUploadUrl',
          path: '/upload-url',
          verbs: ['post'],
        },
      },
      path: '/file',
      service: 'fileUpload',
    })
  })

  it('file matches the previous hand-written config', () => {
    expect(projectEndpointConfig(fileConfigGenerated)).toEqual({
      enable: true,
      endpoints: {
        getAllFile: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            page: {
              defaultValue: 1,
              required: false,
              src: 'query',
            },
            perPage: {
              defaultValue: 50,
              required: false,
              src: 'query',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
          },
          enable: true,
          errors: {},
          method: 'getAll',
          path: '/',
          verbs: ['get'],
        },
        getFile: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            fileId: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
          },
          enable: true,
          errors: {},
          method: 'getOne',
          path: '/:fileId',
          verbs: ['get'],
        },
        getFileDownloadUrl: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            fileId: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            requestHost: {
              required: false,
              src: 'header',
              srcPath: 'X-Forwarded-Host',
            },
            requestProto: {
              required: false,
              src: 'header',
              srcPath: 'X-Forwarded-Proto',
            },
          },
          enable: true,
          errors: {},
          method: 'generateDownloadUrl',
          path: '/:fileId/download-url',
          verbs: ['get'],
        },
        getFilesByResponse: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            page: {
              defaultValue: 1,
              required: false,
              src: 'query',
            },
            perPage: {
              defaultValue: 50,
              required: false,
              src: 'query',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            responseId: {
              required: true,
              src: 'param',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'getFilesForResponse',
          path: '/survey/:surveyId/response/:responseId',
          verbs: ['get'],
        },
        getFilesBySurvey: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            page: {
              defaultValue: 1,
              required: false,
              src: 'query',
            },
            perPage: {
              defaultValue: 50,
              required: false,
              src: 'query',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'getFilesForSurvey',
          path: '/survey/:surveyId',
          verbs: ['get'],
        },
      },
      path: '/file',
      service: 'file',
    })
  })

  it('fileDeletion matches the previous hand-written config', () => {
    expect(projectEndpointConfig(fileDeletionConfigGenerated)).toEqual({
      enable: true,
      endpoints: {
        deleteFile: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            fileId: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
          },
          enable: true,
          errors: {},
          method: 'delete',
          path: '/:fileId',
          verbs: ['delete'],
        },
        deleteImageSet: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            fileContext: {
              required: false,
              src: 'body',
            },
            imageSetId: {
              required: true,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            responseId: {
              required: false,
              src: 'body',
            },
            surveyId: {
              required: false,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'deleteImageSet',
          path: '/image-set',
          verbs: ['delete'],
        },
        hardDeleteFiles: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            fileContext: {
              required: false,
              src: 'query',
            },
            olderThan: {
              required: false,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
          },
          enable: true,
          errors: {},
          method: 'hardDelete',
          path: '/hard{/:olderThan}',
          verbs: ['delete'],
        },
      },
      path: '/file',
      service: 'fileDeletion',
    })
  })
})
