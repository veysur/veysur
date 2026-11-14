// Generated from ServiceSurveySnapshot.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveySnapshotConfig = {
  service: 'surveySnapshot',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getSurveySnapshots: {
      method: 'getAll',
      verbs: ['get'],
      path: '/:surveyId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        page: { src: 'query', required: false, type: Number, defaultValue: 1 },
        perPage: {
          src: 'query',
          required: false,
          type: Number,
          defaultValue: 10,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    deleteManySurveySnapshots: {
      method: 'deleteMany',
      verbs: ['post'],
      path: '/:surveyId/delete-many',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        snapshotIds: { src: 'body', required: true, type: Array },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getSurveySnapshot: {
      method: 'get',
      verbs: ['get'],
      path: '/:surveyId/:snapshotId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        snapshotId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    updateSurveySnapshot: {
      method: 'update',
      verbs: ['patch'],
      path: '/:surveyId/:snapshotId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        snapshotId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        label: { src: 'body', required: false, type: String },
        notes: { src: 'body', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    compareSurveySnapshots: {
      method: 'compare',
      verbs: ['get'],
      path: '/:surveyId/compare/:snapshotIdA/:snapshotIdB',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        snapshotIdA: { src: 'param', required: true, type: String },
        snapshotIdB: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    compareSnapshotWithCurrent: {
      method: 'compareWithCurrent',
      verbs: ['get'],
      path: '/:surveyId/compare-with-current/:snapshotId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        snapshotId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    mergeSnapshotResponses: {
      method: 'mergeSnapshots',
      verbs: ['post'],
      path: '/:surveyId/:targetSnapshotId/merge-from/:sourceSnapshotId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        targetSnapshotId: { src: 'param', required: true, type: String },
        sourceSnapshotId: { src: 'param', required: true, type: String },
        targetPublicationId: { src: 'query', required: false, type: String },
        sourcePublicationId: { src: 'query', required: false, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        options: { src: 'body', required: false },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default surveySnapshotConfig
