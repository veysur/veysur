import { dataTransferJobConfig as generated } from 'model/service/core/ServiceDataTransferJob.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/data-transfer-job.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('dataTransferJob endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        deleteJob: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            jobId: {
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
          method: 'deleteJob',
          path: '/:jobId',
          verbs: ['delete'],
        },
        getStatus: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            jobId: {
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
          method: 'getStatus',
          path: '/status/:jobId',
          verbs: ['get'],
        },
        listJobs: {
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
              defaultValue: 20,
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
          method: 'listJobs',
          path: '/list',
          verbs: ['get'],
        },
      },
      service: 'dataTransferJob',
    })
  })
})
