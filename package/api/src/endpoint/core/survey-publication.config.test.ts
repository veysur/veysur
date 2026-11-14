import { surveyPublicationConfig as generated } from 'model/service/core/ServiceSurveyPublication.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey-publication.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('surveyPublication endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        deleteManyPublications: {
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
            publicationIds: {
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
        getHasUnpublishedChanges: {
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
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'hasUnpublishedChanges',
          path: '/:surveyId/has-unpublished-changes',
          verbs: ['get'],
        },
        getList: {
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
          method: 'getList',
          path: '/:surveyId/list',
          verbs: ['get'],
        },
        getPublication: {
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
            publicationId: {
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
          path: '/:surveyId/publication/:publicationId',
          verbs: ['get'],
        },
        getPublished: {
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
            surveyId: {
              required: true,
              src: 'param',
            },
            withData: {
              defaultValue: false,
              required: false,
              src: 'query',
            },
          },
          enable: true,
          errors: {},
          method: 'getPublished',
          path: '/:surveyId/published',
          verbs: ['get'],
        },
        mergePublicationResponses: {
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
              required: true,
              src: 'param',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
            targetPublicationId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'mergePublications',
          path: '/:surveyId/:targetPublicationId/merge-from/:sourcePublicationId',
          verbs: ['post'],
        },
        postPublish: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            forceNewSnapshot: {
              defaultValue: false,
              required: false,
              src: 'body',
            },
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
            snapshotLabel: {
              required: false,
              src: 'body',
            },
            snapshotNotes: {
              required: false,
              src: 'body',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'publish',
          path: '/:surveyId/publish',
          verbs: ['post'],
        },
        postRepublish: {
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
              src: 'body',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'republish',
          path: '/:surveyId/republish',
          verbs: ['post'],
        },
        postUnpublish: {
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
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'unpublish',
          path: '/:surveyId/unpublish',
          verbs: ['post'],
        },
        updatePublication: {
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
            publicationId: {
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
          path: '/:surveyId/publication/:publicationId',
          verbs: ['patch'],
        },
      },
      service: 'surveyPublication',
    })
  })
})
