import { surveySnapshotConfig as generated } from 'model/service/core/ServiceSurveySnapshot.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey-snapshot.ts before it was deleted. A `default` there
// was never read by the request parser; The service also takes inputs the old config never exposed (an unused surveyId path param, and optional publication ids); they are now declared, so they appear below.
// the generated `defaultValue` is the intentional difference.
describe('surveySnapshot endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        compareWithCurrent: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            snapshotId: {
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
          method: 'compareWithCurrent',
          path: '/:surveyId/compare-with-current/:snapshotId',
          verbs: ['get'],
        },
        compare: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            snapshotIdA: {
              required: true,
              src: 'param',
            },
            snapshotIdB: {
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
          method: 'compare',
          path: '/:surveyId/compare/:snapshotIdA/:snapshotIdB',
          verbs: ['get'],
        },
        deleteMany: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            snapshotIds: {
              required: true,
              src: 'body',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'deleteMany',
          path: '/:surveyId/delete-many',
          verbs: ['post'],
        },
        get: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            snapshotId: {
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
          method: 'get',
          path: '/:surveyId/:snapshotId',
          verbs: ['get'],
        },
        getAll: {
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
              defaultValue: 10,
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
          method: 'getAll',
          path: '/:surveyId',
          verbs: ['get'],
        },
        mergeSnapshots: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            options: {
              required: false,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            sourcePublicationId: {
              required: false,
              src: 'query',
            },
            sourceSnapshotId: {
              required: true,
              src: 'param',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
            targetPublicationId: {
              required: false,
              src: 'query',
            },
            targetSnapshotId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'mergeSnapshots',
          path: '/:surveyId/:targetSnapshotId/merge-from/:sourceSnapshotId',
          verbs: ['post'],
        },
        update: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            label: {
              required: false,
              src: 'body',
            },
            notes: {
              required: false,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            snapshotId: {
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
          method: 'update',
          path: '/:surveyId/:snapshotId',
          verbs: ['patch'],
        },
      },
      service: 'surveySnapshot',
    })
  })
})
