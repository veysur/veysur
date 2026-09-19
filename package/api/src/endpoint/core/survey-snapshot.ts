export const surveySnapshotConfig = {
  service: 'surveySnapshot',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getSurveySnapshots: {
      path: '/:surveyId',
      method: 'getAll',
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
    getSurveySnapshot: {
      path: '/:surveyId/:snapshotId',
      method: 'get',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        snapshotId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    updateSurveySnapshot: {
      path: '/:surveyId/:snapshotId',
      method: 'update',
      verbs: ['patch'],
      data: {
        surveyId: { src: 'param', required: true },
        snapshotId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        label: { src: 'body' },
        notes: { src: 'body' },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },

    deleteManySurveySnapshots: {
      path: '/:surveyId/delete-many',
      method: 'deleteMany',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        snapshotIds: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    compareSurveySnapshots: {
      path: '/:surveyId/compare/:snapshotIdA/:snapshotIdB',
      method: 'compare',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        snapshotIdA: { src: 'param', required: true },
        snapshotIdB: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    compareSnapshotWithCurrent: {
      path: '/:surveyId/compare-with-current/:snapshotId',
      method: 'compareWithCurrent',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        snapshotId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    mergeSnapshotResponses: {
      path: '/:surveyId/:targetSnapshotId/merge-from/:sourceSnapshotId',
      method: 'mergeSnapshots',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        targetSnapshotId: { src: 'param', required: true },
        sourceSnapshotId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        options: { src: 'body' },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
  },
}

export default surveySnapshotConfig
