export const surveyPublicationConfig = {
  service: 'surveyPublication',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    postPublish: {
      path: '/:surveyId/publish',
      method: 'publish',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        label: { src: 'body' },
        notes: { src: 'body' },
        snapshotLabel: { src: 'body' },
        snapshotNotes: { src: 'body' },
        forceNewSnapshot: { src: 'body', default: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    postRepublish: {
      path: '/:surveyId/republish',
      method: 'republish',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        snapshotId: { src: 'body', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        label: { src: 'body' },
        notes: { src: 'body' },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    postUnpublish: {
      path: '/:surveyId/unpublish',
      method: 'unpublish',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getPublished: {
      path: '/:surveyId/published',
      method: 'getPublished',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        withData: { src: 'query', default: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getHasUnpublishedChanges: {
      path: '/:surveyId/has-unpublished-changes',
      method: 'hasUnpublishedChanges',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getList: {
      path: '/:surveyId/list',
      method: 'getList',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        page: { src: 'query', default: 1 },
        perPage: { src: 'query', default: 10 },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getPublication: {
      path: '/:surveyId/publication/:publicationId',
      method: 'get',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        publicationId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    updatePublication: {
      path: '/:surveyId/publication/:publicationId',
      method: 'update',
      verbs: ['patch'],
      data: {
        surveyId: { src: 'param', required: true },
        publicationId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        label: { src: 'body' },
        notes: { src: 'body' },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    deleteManyPublications: {
      path: '/:surveyId/delete-many',
      method: 'deleteMany',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        publicationIds: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    mergePublicationResponses: {
      path: '/:surveyId/:targetPublicationId/merge-from/:sourcePublicationId',
      method: 'mergePublications',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        targetPublicationId: { src: 'param', required: true },
        sourcePublicationId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        options: { src: 'body' },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
  },
}

export default surveyPublicationConfig
