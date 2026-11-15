// Generated from ServiceSurveyPublication.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyPublicationConfig = {
  service: 'surveyPublication',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    publish: {
      method: 'publish',
      verbs: ['post'],
      path: '/:surveyId/publish',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        label: { src: 'body', required: false, type: String },
        notes: { src: 'body', required: false, type: String },
        snapshotLabel: { src: 'body', required: false, type: String },
        snapshotNotes: { src: 'body', required: false, type: String },
        forceNewSnapshot: {
          src: 'body',
          required: false,
          type: Boolean,
          defaultValue: false,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    republish: {
      method: 'republish',
      verbs: ['post'],
      path: '/:surveyId/republish',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        snapshotId: { src: 'body', required: true, type: String },
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
    unpublish: {
      method: 'unpublish',
      verbs: ['post'],
      path: '/:surveyId/unpublish',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getPublished: {
      method: 'getPublished',
      verbs: ['get'],
      path: '/:surveyId/published',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        withData: { src: 'query', required: false, type: Boolean },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    hasUnpublishedChanges: {
      method: 'hasUnpublishedChanges',
      verbs: ['get'],
      path: '/:surveyId/has-unpublished-changes',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getList: {
      method: 'getList',
      verbs: ['get'],
      path: '/:surveyId/list',
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
    get: {
      method: 'get',
      verbs: ['get'],
      path: '/:surveyId/publication/:publicationId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        publicationId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    update: {
      method: 'update',
      verbs: ['patch'],
      path: '/:surveyId/publication/:publicationId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        publicationId: { src: 'param', required: true, type: String },
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
    deleteMany: {
      method: 'deleteMany',
      verbs: ['post'],
      path: '/:surveyId/delete-many',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        publicationIds: { src: 'body', required: true, type: Array },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    mergePublications: {
      method: 'mergePublications',
      verbs: ['post'],
      path: '/:surveyId/:targetPublicationId/merge-from/:sourcePublicationId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        targetPublicationId: { src: 'param', required: true, type: String },
        sourcePublicationId: { src: 'param', required: true, type: String },
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

export default surveyPublicationConfig
