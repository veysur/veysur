import { importExportConfig as generated } from 'model/service/core/ServiceImportExport.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/import-export.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('importExport endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        exportEntity: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            entityId: {
              required: true,
              src: 'param',
            },
            entityType: {
              required: true,
              src: 'param',
            },
            format: {
              required: true,
              src: 'param',
            },
            options: {
              required: false,
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
          },
          enable: true,
          errors: {},
          method: 'export',
          path: '/export/:entityType/:entityId/:format',
          verbs: ['post'],
        },
        generateImportUrl: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            entityType: {
              required: true,
              src: 'param',
            },
            fileHash: {
              required: false,
              src: 'body',
            },
            format: {
              required: true,
              src: 'body',
            },
            options: {
              required: false,
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
          },
          enable: true,
          errors: {},
          method: 'generateImportUrl',
          path: '/import/url/:entityType',
          verbs: ['post'],
        },
        getImportStatus: {
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
          method: 'getImportStatus',
          path: '/import/status/:fileId',
          verbs: ['get'],
        },
        processImport: {
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
          method: 'processImport',
          path: '/import/process/:fileId',
          verbs: ['post'],
        },
      },
      service: 'importExport',
    })
  })
})
